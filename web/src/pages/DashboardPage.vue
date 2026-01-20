<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppButton from '@/components/base/AppButton.vue'
import StatCard from '@/components/domain/StatCard.vue'
import ProductCard from '@/components/domain/ProductCard.vue'
import NegotiationCard from '@/components/domain/NegotiationCard.vue'
import { useAuthStore } from '@/stores/auth'
import { getMyProducts } from '@/api/products'
import { resolveImageUrl } from '@/api/client'
import { getMyTransactions } from '@/api/transactions'
import { getSellerPendingNegotiations, getBuyerPendingNegotiations, getAcceptedOffers, acceptOffer } from '@/api/offers'
import { formatCurrency } from '@/utils/currency'
import type { SellerProductItem, Transaction, PendingNegotiation, AcceptedOffer } from '@/types/api'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)

const products = ref<SellerProductItem[]>([])
const transactions = ref<Transaction[]>([])
const negotiations = ref<PendingNegotiation[]>([])
const acceptedOffers = ref<AcceptedOffer[]>([])

const stats = computed(() => ({
  totalListings: products.value.filter((p) => p.status !== 'sold').length,
  activeNegotiations: negotiations.value.length,
  completedSales: transactions.value.length,
  totalRevenue: transactions.value.reduce((sum, t) => sum + t.finalPrice, 0),
}))

const productCards = computed(() =>
  products.value.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    status: p.offerCount > 0 ? ('negotiating' as const) : p.status,
    image: resolveImageUrl(p.image),
    offers: p.offerCount,
  }))
)

const negotiationCards = computed(() =>
  negotiations.value.map((n) => ({
    id: n.id,
    productId: n.productId,
    product: n.productName,
    counterparty: n.buyerName ?? n.sellerName ?? 'Unknown',
    currentOffer: n.amount,
    askingPrice: n.productPrice,
    timeline: [
      {
        type: (n.sellerName ? 'counter' : 'offer') as 'offer' | 'counter',
        from: (n.sellerName ? 'seller' : 'buyer') as 'buyer' | 'seller',
        amount: n.amount,
        time: formatRelativeTime(n.createdAt),
      },
    ],
  }))
)

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  return 'just now'
}

const fetchData = async () => {
  loading.value = true
  error.value = null

  try {
    const [productsData, transactionsData, sellerNegotiations, buyerNegotiations, acceptedData] = await Promise.all([
      getMyProducts(),
      getMyTransactions(),
      getSellerPendingNegotiations(),
      getBuyerPendingNegotiations(),
      getAcceptedOffers(),
    ])

    products.value = productsData
    transactions.value = transactionsData
    negotiations.value = [...sellerNegotiations, ...buyerNegotiations]
    acceptedOffers.value = acceptedData
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
}

const handleAccept = async (offerId: number) => {
  try {
    await acceptOffer(offerId)
    negotiations.value = negotiations.value.filter((n) => n.id !== offerId)
    await fetchData()
  } catch (err) {
    console.error('Failed to accept offer:', err)
  }
}

const goToProduct = (productId: number) => {
  router.push(`/products/${productId}`)
}

onMounted(fetchData)

const firstName = computed(() => authStore.user?.name.split(' ')[0] ?? '')
</script>

<template>
  <PageLayout :user="authStore.user ?? undefined">
    <section class="welcome">
      <div class="welcome-text">
        <span class="welcome-label">Welcome back</span>
        <h1 class="welcome-name">{{ firstName }}</h1>
      </div>
      <RouterLink to="/products/new">
        <AppButton variant="primary">
          <span class="btn-icon">+</span>
          List New Item
        </AppButton>
      </RouterLink>
    </section>

    <section class="stats-grid">
      <StatCard
        :value="stats.totalListings"
        label="Active Listings"
        show-decoration
      />
      <StatCard
        :value="stats.activeNegotiations"
        label="In Negotiation"
        highlight
        show-pulse
      />
      <StatCard
        :value="stats.completedSales"
        label="Sales Completed"
      />
      <StatCard
        :value="formatCurrency(stats.totalRevenue)"
        label="Total Revenue"
      />
    </section>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="content-grid">
      <section class="negotiations-section">
        <div class="section-header">
          <h2 class="section-title">Active Negotiations</h2>
          <span v-if="negotiationCards.length > 0" class="section-count">{{ negotiationCards.length }}</span>
        </div>

        <div v-if="negotiationCards.length === 0 && acceptedOffers.length === 0" class="empty-state">
          No pending negotiations
        </div>
        <div v-else class="negotiations-list">
          <div v-for="offer in acceptedOffers" :key="`accepted-${offer.id}`" class="accepted-offer-card">
            <div class="accepted-header">
              <span class="accepted-badge">Offer Accepted</span>
              <h3 class="accepted-product">{{ offer.productName }}</h3>
              <span class="accepted-seller">from {{ offer.sellerName }}</span>
            </div>
            <div class="accepted-details">
              <span class="accepted-price">{{ formatCurrency(offer.amount) }}</span>
              <AppButton variant="primary" @click="goToProduct(offer.productId)">
                Complete Purchase
              </AppButton>
            </div>
          </div>
          <NegotiationCard
            v-for="neg in negotiationCards"
            :key="neg.id"
            :product="neg.product"
            :counterparty="neg.counterparty"
            :timeline="neg.timeline"
            :current-offer="neg.currentOffer"
            :asking-price="neg.askingPrice"
            :product-id="neg.productId"
            @accept="handleAccept(neg.id)"
            @counter="goToProduct(neg.productId)"
          />
        </div>
      </section>

      <section class="products-section">
        <div class="section-header">
          <h2 class="section-title">Your Listings</h2>
        </div>

        <div v-if="productCards.length === 0" class="empty-state">
          No products listed yet
        </div>
        <div v-else class="products-list">
          <RouterLink
            v-for="product in productCards"
            :key="product.id"
            :to="`/products/${product.id}`"
            class="product-link"
          >
            <ProductCard
              :name="product.name"
              :price="product.price"
              :status="product.status"
              :image="product.image"
              :offers="product.offers"
            />
          </RouterLink>
        </div>
      </section>
    </div>
  </PageLayout>
</template>

<style scoped>
.welcome {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--space-2xl);
}

.welcome-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--sage);
  margin-bottom: var(--space-xs);
}

.welcome-name {
  font-family: var(--font-display);
  font-size: 4rem;
  font-weight: 500;
  color: var(--forest);
  line-height: 1;
  letter-spacing: -0.03em;
}

.btn-icon {
  font-size: 1.25rem;
  font-weight: 300;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-2xl);
}

.content-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--space-xl);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.section-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 500;
  color: var(--forest);
  letter-spacing: -0.02em;
}

.section-count {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--coral);
  color: white;
  border-radius: 50%;
  font-size: 0.8125rem;
  font-weight: 600;
}

.section-link {
  font-size: 0.875rem;
  color: var(--coral);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.section-link:hover {
  color: var(--forest);
}

.negotiations-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.product-link {
  text-decoration: none;
}

.loading,
.error {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--charcoal-soft);
}

.error {
  color: var(--coral);
}

.empty-state {
  padding: var(--space-xl);
  text-align: center;
  color: var(--charcoal-soft);
  background: var(--warm-white);
  border-radius: 16px;
}

.accepted-offer-card {
  background: linear-gradient(135deg, var(--sage-light) 0%, white 100%);
  border-radius: 24px;
  padding: var(--space-xl);
  border: 2px solid var(--sage);
}

.accepted-header {
  margin-bottom: var(--space-md);
}

.accepted-badge {
  display: inline-block;
  background: var(--sage);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 6px;
  margin-bottom: var(--space-sm);
}

.accepted-product {
  font-family: var(--font-display);
  font-size: 1.375rem;
  font-weight: 500;
  color: var(--charcoal);
  margin-bottom: var(--space-xs);
}

.accepted-seller {
  font-size: 0.8125rem;
  color: var(--charcoal-soft);
}

.accepted-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.accepted-price {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--forest);
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .welcome-name {
    font-size: 2.5rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
