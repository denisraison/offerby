<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/base/AppButton.vue'
import { formatCurrency } from '@/utils/currency'
import type { Offer } from '@/types/api'

const props = defineProps<{
  offers: Offer[]
  currentUserId: number
  askingPrice: number
  submitting: boolean
  canMakeInitialOffer: boolean
}>()

const emit = defineEmits<{
  makeOffer: []
  counter: []
  accept: []
}>()

const myOffers = computed(() =>
  props.offers.filter((o) => o.buyerId === props.currentUserId)
)

const otherOffers = computed(() =>
  props.offers.filter((o) => o.buyerId !== props.currentUserId)
)

const myLatestOffer = computed(() => {
  if (myOffers.value.length === 0) return null
  return [...myOffers.value].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0]!
})

const hasMyNegotiation = computed(() => myOffers.value.length > 0)

const isWaitingForSeller = computed(() => {
  if (!myLatestOffer.value) return false
  return myLatestOffer.value.status === 'pending' && myLatestOffer.value.proposedBy === 'buyer'
})

const canRespondToSeller = computed(() => {
  if (!myLatestOffer.value) return false
  return myLatestOffer.value.status === 'pending' && myLatestOffer.value.canAccept
})

const otherBuyersCount = computed(() => {
  const buyerIds = new Set(otherOffers.value.map((o) => o.buyerId))
  return buyerIds.size
})

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('en-AU', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const getProgressWidth = (amount: number) => {
  return Math.min((amount / props.askingPrice) * 100, 100)
}
</script>

<template>
  <div class="buyer-negotiation">
    <div v-if="hasMyNegotiation" class="my-negotiation">
      <div class="section-header">
        <h2 class="section-title">Your Negotiation</h2>
        <span v-if="isWaitingForSeller" class="status-badge waiting">Pending</span>
        <span v-else-if="canRespondToSeller" class="status-badge action">Your turn</span>
      </div>

      <div class="negotiation-card">
        <div class="offer-timeline">
          <div
            v-for="(offer, idx) in myOffers"
            :key="offer.id"
            class="timeline-entry"
            :class="[offer.proposedBy, { latest: idx === myOffers.length - 1 }]"
          >
            <div class="entry-marker">
              <span class="marker-dot" />
              <span v-if="idx < myOffers.length - 1" class="marker-line" />
            </div>
            <div class="entry-content">
              <div class="entry-header">
                <span class="entry-who">{{ offer.proposedBy === 'buyer' ? 'You offered' : 'Seller countered' }}</span>
                <span class="entry-time">{{ formatTime(offer.createdAt) }}</span>
              </div>
              <span class="entry-amount">{{ formatCurrency(offer.amount) }}</span>
            </div>
          </div>
        </div>

        <div class="price-gauge">
          <div class="gauge-track">
            <div
              class="gauge-fill"
              :style="{ width: `${getProgressWidth(myLatestOffer!.amount)}%` }"
            />
            <div
              class="gauge-marker"
              :style="{ left: `${getProgressWidth(myLatestOffer!.amount)}%` }"
            />
          </div>
          <div class="gauge-labels">
            <span class="gauge-min">$0</span>
            <span class="gauge-current">{{ formatCurrency(myLatestOffer!.amount) }}</span>
            <span class="gauge-max">{{ formatCurrency(askingPrice) }}</span>
          </div>
        </div>

        <div v-if="isWaitingForSeller" class="status-message waiting-state">
          <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          <span>Waiting for seller to respond</span>
        </div>

        <div v-else-if="canRespondToSeller" class="response-prompt">
          <p class="prompt-text">
            Seller countered at <strong>{{ formatCurrency(myLatestOffer!.amount) }}</strong>
          </p>
          <div class="prompt-actions">
            <AppButton variant="outline" :disabled="submitting" @click="emit('counter')">
              Counter
            </AppButton>
            <AppButton variant="primary" :disabled="submitting" @click="emit('accept')">
              Accept {{ formatCurrency(myLatestOffer!.amount) }}
            </AppButton>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="canMakeInitialOffer" class="no-negotiation">
      <div class="cta-card">
        <div class="cta-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h3>Start Negotiating</h3>
        <p>Make an offer to begin the conversation with the seller.</p>
        <AppButton variant="primary" @click="emit('makeOffer')">
          Make an Offer
        </AppButton>
      </div>
    </div>

    <div v-if="otherOffers.length > 0" class="other-activity">
      <div class="activity-header">
        <span class="activity-label">Other Activity</span>
        <span class="activity-divider" />
        <span class="activity-count">{{ otherBuyersCount }} {{ otherBuyersCount === 1 ? 'buyer' : 'buyers' }}</span>
      </div>
      <div class="activity-list">
        <div
          v-for="offer in otherOffers"
          :key="offer.id"
          class="activity-item"
        >
          <span class="item-name">{{ offer.buyerName }}</span>
          <span class="item-action">{{ offer.proposedBy === 'buyer' ? 'offered' : 'countered at' }}</span>
          <span class="item-amount">{{ formatCurrency(offer.amount) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.buyer-negotiation {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.section-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--charcoal);
  margin: 0;
}

.status-badge {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 4px;
}

.status-badge.waiting {
  background: var(--cream-dark);
  color: var(--charcoal-soft);
}

.status-badge.action {
  background: var(--coral);
  color: white;
}

.negotiation-card {
  background: white;
  border: 1px solid var(--cream-dark);
  border-radius: 12px;
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.offer-timeline {
  display: flex;
  flex-direction: column;
}

.timeline-entry {
  display: flex;
  gap: var(--space-md);
  position: relative;
}

.entry-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 6px;
}

.marker-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--cream-dark);
  border: 2px solid white;
  box-shadow: 0 0 0 2px var(--cream-dark);
  flex-shrink: 0;
}

.timeline-entry.buyer .marker-dot {
  background: var(--forest);
  box-shadow: 0 0 0 2px var(--sage-light);
}

.timeline-entry.seller .marker-dot {
  background: var(--coral);
  box-shadow: 0 0 0 2px var(--coral-soft);
}

.marker-line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  background: var(--cream-dark);
  margin: 4px 0;
}

.entry-content {
  flex: 1;
  padding-bottom: var(--space-md);
}

.timeline-entry.latest .entry-content {
  padding-bottom: 0;
}

.entry-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin-bottom: 2px;
}

.entry-who {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--charcoal-soft);
}

.entry-time {
  font-size: 0.6875rem;
  color: var(--charcoal-soft);
  opacity: 0.7;
}

.entry-amount {
  font-size: 1.375rem;
  font-weight: 600;
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}

.timeline-entry.buyer .entry-amount {
  color: var(--forest);
}

.timeline-entry.seller .entry-amount {
  color: var(--coral);
}

.price-gauge {
  padding-top: var(--space-sm);
  border-top: 1px solid var(--cream-dark);
}

.gauge-track {
  height: 4px;
  background: var(--cream-dark);
  border-radius: 2px;
  position: relative;
  margin-bottom: var(--space-xs);
}

.gauge-fill {
  height: 100%;
  background: var(--forest);
  border-radius: 2px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.gauge-marker {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid var(--forest);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.gauge-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: var(--charcoal-soft);
}

.gauge-current {
  font-weight: 600;
  color: var(--forest);
}

.status-message {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--cream);
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--charcoal-soft);
}

.status-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.6;
}

.response-prompt {
  padding: var(--space-md);
  background: var(--cream);
  border-radius: 8px;
}

.prompt-text {
  margin: 0 0 var(--space-md);
  font-size: 0.9375rem;
  color: var(--charcoal);
}

.prompt-text strong {
  color: var(--coral);
}

.prompt-actions {
  display: flex;
  gap: var(--space-sm);
}

.no-negotiation .cta-card {
  background: white;
  border: 1px dashed var(--cream-dark);
  border-radius: 12px;
  padding: var(--space-xl);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.cta-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream);
  border-radius: 12px;
  color: var(--forest);
}

.cta-icon svg {
  width: 24px;
  height: 24px;
}

.cta-card h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--charcoal);
}

.cta-card p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--charcoal-soft);
  max-width: 240px;
}

.other-activity {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.other-activity:hover {
  opacity: 1;
}

.activity-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.activity-label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--charcoal-soft);
}

.activity-divider {
  flex: 1;
  height: 1px;
  background: var(--cream-dark);
}

.activity-count {
  font-size: 0.6875rem;
  color: var(--charcoal-soft);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.activity-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.8125rem;
  color: var(--charcoal-soft);
}

.item-name {
  font-weight: 500;
  color: var(--charcoal);
}

.item-amount {
  font-weight: 600;
  color: var(--charcoal);
  margin-left: auto;
}
</style>
