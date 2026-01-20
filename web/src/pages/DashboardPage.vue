<script setup lang="ts">
import { ref, computed } from 'vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppButton from '@/components/base/AppButton.vue'
import StatCard from '@/components/domain/StatCard.vue'
import ProductCard from '@/components/domain/ProductCard.vue'
import NegotiationCard from '@/components/domain/NegotiationCard.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const stats = ref({
  totalListings: 24,
  activeNegotiations: 7,
  completedSales: 156,
  totalRevenue: 48750
})

const recentProducts = ref([
  { id: 1, name: 'Vintage Eames Chair', price: 2400, status: 'negotiating' as const, image: null, offers: 3 },
  { id: 2, name: 'Mid-Century Desk Lamp', price: 180, status: 'available' as const, image: null, offers: 0 },
  { id: 3, name: 'Handwoven Moroccan Rug', price: 890, status: 'reserved' as const, image: null, offers: 1 },
  { id: 4, name: 'Ceramic Vase Set', price: 320, status: 'available' as const, image: null, offers: 2 },
])

const negotiations = ref([
  {
    id: 1,
    product: 'Vintage Eames Chair',
    buyer: 'Marcus Webb',
    timeline: [
      { type: 'offer' as const, from: 'buyer' as const, amount: 1800, time: '2 days ago' },
      { type: 'counter' as const, from: 'seller' as const, amount: 2200, time: '1 day ago' },
      { type: 'offer' as const, from: 'buyer' as const, amount: 2000, time: '6 hours ago' },
    ],
    currentOffer: 2000,
    yourPrice: 2400
  },
  {
    id: 2,
    product: 'Ceramic Vase Set',
    buyer: 'Elena Rodriguez',
    timeline: [
      { type: 'offer' as const, from: 'buyer' as const, amount: 250, time: '3 hours ago' },
    ],
    currentOffer: 250,
    yourPrice: 320
  },
])

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0
  }).format(amount)
}

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

    <div class="content-grid">
      <section class="negotiations-section">
        <div class="section-header">
          <h2 class="section-title">Active Negotiations</h2>
          <span class="section-count">{{ negotiations.length }}</span>
        </div>

        <div class="negotiations-list">
          <NegotiationCard
            v-for="neg in negotiations"
            :key="neg.id"
            :product="neg.product"
            :buyer="neg.buyer"
            :timeline="neg.timeline"
            :current-offer="neg.currentOffer"
            :asking-price="neg.yourPrice"
          />
        </div>
      </section>

      <section class="products-section">
        <div class="section-header">
          <h2 class="section-title">Your Listings</h2>
        </div>

        <div class="products-list">
          <RouterLink
            v-for="product in recentProducts"
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
