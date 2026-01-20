<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppBadge from '@/components/base/AppBadge.vue'
import AppInput from '@/components/base/AppInput.vue'
import NegotiationTimeline from '@/components/domain/NegotiationTimeline.vue'
import { getProduct } from '@/api/products'
import { createOffer, counterOffer, acceptOffer, purchaseProduct } from '@/api/offers'
import type { ProductDetail, Offer } from '@/types/api'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const product = ref<ProductDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const submitting = ref(false)

const offerAmount = ref('')
const showOfferForm = ref(false)
const counterAmount = ref('')
const showCounterForm = ref(false)

onMounted(async () => {
  const id = parseInt(route.params.id as string, 10)
  await loadProduct(id)
})

async function loadProduct(id: number) {
  loading.value = true
  error.value = null
  try {
    product.value = await getProduct(id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load product'
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0
  }).format(amount)
}

const currentImage = ref(0)

const displayImage = computed(() => {
  if (!product.value?.images.length) return null
  return product.value.images[currentImage.value]
})

const isSeller = computed(() =>
  authStore.user && product.value && authStore.user.id === product.value.sellerId
)

const userOffers = computed(() => {
  if (!product.value || !authStore.user) return []
  return product.value.offers.filter(
    (o) => o.buyerId === authStore.user!.id || product.value!.sellerId === authStore.user!.id
  )
})

const pendingOffer = computed(() =>
  userOffers.value.find((o) => o.status === 'pending')
)

const acceptedOffer = computed(() =>
  userOffers.value.find((o) => o.status === 'accepted' && o.buyerId === authStore.user?.id)
)

const timelineEvents = computed(() => {
  if (!product.value) return []
  return userOffers.value.map((offer) => ({
    type: offer.parentOfferId ? 'counter' as const : 'offer' as const,
    from: offer.proposedBy,
    amount: offer.amount,
    time: new Date(offer.createdAt).toLocaleString('en-AU', {
      dateStyle: 'short',
      timeStyle: 'short',
    }),
  }))
})

const hasNegotiation = computed(() => timelineEvents.value.length > 0)

const currentOfferAmount = computed(() =>
  pendingOffer.value?.amount ?? acceptedOffer.value?.amount ?? 0
)

const isWaitingForResponse = computed(() => {
  if (!pendingOffer.value || !authStore.user || !product.value) return false
  const userRole = authStore.user.id === pendingOffer.value.buyerId ? 'buyer' : 'seller'
  return pendingOffer.value.proposedBy === userRole
})

const handleMakeOffer = () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  showOfferForm.value = true
}

const handleSubmitOffer = async () => {
  if (!offerAmount.value || !product.value) return
  const amount = parseFloat(offerAmount.value)
  if (isNaN(amount) || amount <= 0) return

  submitting.value = true
  try {
    await createOffer(product.value.id, amount)
    showOfferForm.value = false
    offerAmount.value = ''
    await loadProduct(product.value.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to submit offer'
  } finally {
    submitting.value = false
  }
}

const handleStartCounter = () => {
  showCounterForm.value = true
}

const handleCounter = async () => {
  if (!counterAmount.value || !pendingOffer.value) return
  const amount = parseFloat(counterAmount.value)
  if (isNaN(amount) || amount <= 0) return

  submitting.value = true
  try {
    await counterOffer(pendingOffer.value.id, amount)
    showCounterForm.value = false
    counterAmount.value = ''
    await loadProduct(product.value!.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to counter offer'
  } finally {
    submitting.value = false
  }
}

const handleAccept = async () => {
  if (!pendingOffer.value || !product.value) return

  submitting.value = true
  try {
    await acceptOffer(pendingOffer.value.id)
    await loadProduct(product.value.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to accept offer'
  } finally {
    submitting.value = false
  }
}

const handlePurchase = async () => {
  if (!product.value) return
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }

  submitting.value = true
  try {
    await purchaseProduct(product.value.id, acceptedOffer.value?.id)
    await loadProduct(product.value.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to complete purchase'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PageLayout :user="authStore.user ?? undefined">
    <section class="page-header">
      <RouterLink to="/products" class="back-link">
        <span class="back-arrow">&larr;</span>
        Back to Browse
      </RouterLink>
    </section>

    <div v-if="loading" class="loading">Loading product...</div>

    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else-if="product" class="product-layout">
      <div class="product-image-section">
        <div v-if="displayImage" class="image-container">
          <img
            :src="`http://localhost:3000${displayImage.path}`"
            :alt="product.name"
            class="product-image"
          />
        </div>
        <div v-else class="image-placeholder">
          <span>{{ product.name.charAt(0) }}</span>
        </div>

        <div v-if="product.images.length > 1" class="image-thumbnails">
          <button
            v-for="(img, idx) in product.images"
            :key="img.id"
            :class="['thumbnail', { active: idx === currentImage }]"
            @click="currentImage = idx"
          >
            <img :src="`http://localhost:3000${img.path}`" :alt="`${product.name} ${idx + 1}`" />
          </button>
        </div>
      </div>

      <div class="product-details">
        <div class="product-header">
          <AppBadge :variant="product.status">{{ product.status }}</AppBadge>
          <h1 class="product-name">{{ product.name }}</h1>
          <p class="product-price">{{ formatCurrency(product.price) }}</p>
        </div>

        <div v-if="product.description" class="product-description">
          <h2 class="section-title">Description</h2>
          <p class="description-text">{{ product.description }}</p>
        </div>

        <div class="seller-info">
          <h2 class="section-title">Seller</h2>
          <div class="seller-card">
            <div class="seller-avatar">{{ product.sellerName.charAt(0) }}</div>
            <span class="seller-name">{{ product.sellerName }}</span>
          </div>
        </div>

        <div v-if="hasNegotiation" class="negotiation-section">
          <h2 class="section-title">Negotiation</h2>
          <NegotiationTimeline
            :events="timelineEvents"
            :asking-price="product.price"
          />
          <p v-if="currentOfferAmount" class="current-offer">
            Current offer: <strong>{{ formatCurrency(currentOfferAmount) }}</strong>
            <span v-if="acceptedOffer" class="accepted-badge">Accepted</span>
          </p>
          <p v-if="isWaitingForResponse" class="waiting-message">
            Waiting for response...
          </p>
        </div>

        <div class="product-actions">
          <template v-if="product.status === 'sold'">
            <p class="sold-message">This item has been sold</p>
          </template>

          <template v-else-if="isSeller">
            <p class="seller-message">This is your listing</p>
            <template v-if="pendingOffer && pendingOffer.canAccept">
              <div v-if="showCounterForm" class="offer-form">
                <AppInput
                  v-model="counterAmount"
                  type="number"
                  placeholder="Enter counter amount"
                />
                <div class="offer-actions">
                  <AppButton variant="ghost" @click="showCounterForm = false" :disabled="submitting">
                    Cancel
                  </AppButton>
                  <AppButton variant="primary" @click="handleCounter" :disabled="submitting">
                    {{ submitting ? 'Sending...' : 'Send Counter' }}
                  </AppButton>
                </div>
              </div>
              <div v-else class="offer-actions">
                <AppButton variant="outline" @click="handleStartCounter" :disabled="submitting">
                  Counter
                </AppButton>
                <AppButton variant="primary" @click="handleAccept" :disabled="submitting">
                  {{ submitting ? 'Accepting...' : 'Accept Offer' }}
                </AppButton>
              </div>
            </template>
          </template>

          <template v-else>
            <div v-if="showOfferForm" class="offer-form">
              <AppInput
                v-model="offerAmount"
                type="number"
                placeholder="Enter your offer"
              />
              <div class="offer-actions">
                <AppButton variant="ghost" @click="showOfferForm = false" :disabled="submitting">
                  Cancel
                </AppButton>
                <AppButton variant="primary" @click="handleSubmitOffer" :disabled="submitting">
                  {{ submitting ? 'Submitting...' : 'Submit Offer' }}
                </AppButton>
              </div>
            </div>

            <template v-else-if="acceptedOffer">
              <AppButton variant="primary" @click="handlePurchase" :disabled="submitting">
                {{ submitting ? 'Processing...' : `Buy Now - ${formatCurrency(acceptedOffer.amount)}` }}
              </AppButton>
            </template>

            <template v-else-if="pendingOffer && pendingOffer.canAccept">
              <div v-if="showCounterForm" class="offer-form">
                <AppInput
                  v-model="counterAmount"
                  type="number"
                  placeholder="Enter counter amount"
                />
                <div class="offer-actions">
                  <AppButton variant="ghost" @click="showCounterForm = false" :disabled="submitting">
                    Cancel
                  </AppButton>
                  <AppButton variant="primary" @click="handleCounter" :disabled="submitting">
                    {{ submitting ? 'Sending...' : 'Send Counter' }}
                  </AppButton>
                </div>
              </div>
              <div v-else class="offer-actions">
                <AppButton variant="outline" @click="handleStartCounter" :disabled="submitting">
                  Counter
                </AppButton>
                <AppButton variant="primary" @click="handleAccept" :disabled="submitting">
                  {{ submitting ? 'Accepting...' : 'Accept Offer' }}
                </AppButton>
              </div>
            </template>

            <template v-else-if="product.canMakeInitialOffer">
              <AppButton variant="primary" @click="handleMakeOffer">
                Make an Offer
              </AppButton>
              <AppButton v-if="product.canPurchase" variant="outline" @click="handlePurchase" :disabled="submitting">
                {{ submitting ? 'Processing...' : `Buy Now - ${formatCurrency(product.price)}` }}
              </AppButton>
            </template>

            <template v-else-if="product.canPurchase">
              <AppButton variant="primary" @click="handlePurchase" :disabled="submitting">
                {{ submitting ? 'Processing...' : `Buy Now - ${formatCurrency(product.price)}` }}
              </AppButton>
            </template>

            <template v-else-if="!authStore.isAuthenticated">
              <AppButton variant="primary" @click="router.push('/login')">
                Login to Make an Offer
              </AppButton>
            </template>
          </template>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.page-header {
  margin-bottom: var(--space-lg);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.875rem;
  color: var(--charcoal-soft);
  text-decoration: none;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--charcoal);
}

.back-arrow {
  font-size: 1.125rem;
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

.product-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2xl);
}

.product-image-section {
  position: sticky;
  top: calc(80px + var(--space-xl));
  height: fit-content;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.image-container {
  aspect-ratio: 1;
  border-radius: 24px;
  overflow: hidden;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  aspect-ratio: 1;
  background: linear-gradient(135deg, var(--sage-light) 0%, var(--cream-dark) 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 6rem;
  font-weight: 500;
  color: var(--forest);
}

.image-thumbnails {
  display: flex;
  gap: var(--space-sm);
}

.thumbnail {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
  transition: border-color 0.2s;
}

.thumbnail.active {
  border-color: var(--forest);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.product-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-md);
}

.product-name {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 500;
  color: var(--charcoal);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.product-price {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 600;
  color: var(--forest);
}

.section-title {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--charcoal-soft);
  margin-bottom: var(--space-md);
}

.description-text {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--charcoal);
}

.seller-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.seller-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--forest);
  color: var(--cream);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
}

.seller-name {
  font-weight: 500;
  color: var(--charcoal);
}

.current-offer {
  font-size: 0.9375rem;
  color: var(--charcoal-soft);
  margin-top: var(--space-md);
}

.current-offer strong {
  color: var(--coral);
}

.accepted-badge {
  display: inline-block;
  margin-left: var(--space-sm);
  padding: 2px 8px;
  background: var(--forest);
  color: var(--cream);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.waiting-message {
  font-size: 0.875rem;
  color: var(--charcoal-soft);
  font-style: italic;
  margin-top: var(--space-sm);
}

.product-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--cream-dark);
}

.offer-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.offer-actions {
  display: flex;
  gap: var(--space-sm);
}

.sold-message,
.seller-message {
  font-size: 0.9375rem;
  color: var(--charcoal-soft);
}

@media (max-width: 1024px) {
  .product-layout {
    grid-template-columns: 1fr;
  }

  .product-image-section {
    position: static;
  }
}
</style>
