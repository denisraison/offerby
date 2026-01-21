<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/base/AppButton.vue'
import { formatCurrency } from '@/utils/currency'
import type { Offer } from '@/types/api'

const props = defineProps<{
  offers: Offer[]
  askingPrice: number
  submitting: boolean
}>()

const emit = defineEmits<{
  counter: [buyerId: number, offerId: number]
  accept: [offerId: number]
}>()

interface BuyerNegotiation {
  buyerId: number
  buyerName: string
  offers: Offer[]
  latestOffer: Offer
  canRespond: boolean
  waitingForBuyer: boolean
}

const negotiationsByBuyer = computed<BuyerNegotiation[]>(() => {
  const byBuyer = new Map<number, Offer[]>()

  for (const offer of props.offers) {
    const existing = byBuyer.get(offer.buyerId) ?? []
    existing.push(offer)
    byBuyer.set(offer.buyerId, existing)
  }

  return Array.from(byBuyer.entries()).map(([buyerId, offers]) => {
    const sorted = [...offers].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const latest = sorted[0]!

    return {
      buyerId,
      buyerName: latest.buyerName,
      offers: sorted.reverse(),
      latestOffer: latest,
      canRespond: latest.status === 'pending' && latest.canAccept,
      waitingForBuyer: latest.status === 'pending' && latest.proposedBy === 'seller',
    }
  })
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
  <div class="seller-offers">
    <div class="section-header">
      <h2 class="section-title">Offers</h2>
      <span class="offer-count">{{ negotiationsByBuyer.length }}</span>
    </div>

    <div class="buyer-cards">
      <div
        v-for="negotiation in negotiationsByBuyer"
        :key="negotiation.buyerId"
        class="buyer-card"
        :class="{ 'can-respond': negotiation.canRespond }"
      >
        <div class="buyer-header">
          <div class="buyer-avatar">{{ negotiation.buyerName.charAt(0) }}</div>
          <div class="buyer-info">
            <span class="buyer-name">{{ negotiation.buyerName }}</span>
            <span v-if="negotiation.waitingForBuyer" class="status-badge waiting">Pending</span>
            <span v-else-if="negotiation.canRespond" class="status-badge action">Your turn</span>
          </div>
        </div>

        <div class="offer-timeline">
          <div
            v-for="(offer, idx) in negotiation.offers"
            :key="offer.id"
            class="timeline-entry"
            :class="[offer.proposedBy, { latest: idx === negotiation.offers.length - 1 }]"
          >
            <div class="entry-marker">
              <span class="marker-dot" />
              <span v-if="idx < negotiation.offers.length - 1" class="marker-line" />
            </div>
            <div class="entry-content">
              <div class="entry-header">
                <span class="entry-who">{{ offer.proposedBy === 'buyer' ? negotiation.buyerName : 'You' }}</span>
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
              :style="{ width: `${getProgressWidth(negotiation.latestOffer.amount)}%` }"
            />
            <div
              class="gauge-marker"
              :style="{ left: `${getProgressWidth(negotiation.latestOffer.amount)}%` }"
            />
          </div>
          <div class="gauge-labels">
            <span class="gauge-min">$0</span>
            <span class="gauge-current">{{ formatCurrency(negotiation.latestOffer.amount) }}</span>
            <span class="gauge-max">{{ formatCurrency(askingPrice) }}</span>
          </div>
        </div>

        <div v-if="negotiation.waitingForBuyer" class="status-message">
          <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          <span>Waiting for {{ negotiation.buyerName }} to respond</span>
        </div>

        <div v-else-if="negotiation.canRespond" class="response-prompt">
          <p class="prompt-text">
            {{ negotiation.buyerName }} offered <strong>{{ formatCurrency(negotiation.latestOffer.amount) }}</strong>
          </p>
          <div class="prompt-actions">
            <AppButton
              variant="outline"
              :disabled="submitting"
              @click="emit('counter', negotiation.buyerId, negotiation.latestOffer.id)"
            >
              Counter
            </AppButton>
            <AppButton
              variant="primary"
              :disabled="submitting"
              @click="emit('accept', negotiation.latestOffer.id)"
            >
              Accept {{ formatCurrency(negotiation.latestOffer.amount) }}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seller-offers {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.section-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--charcoal);
  margin: 0;
}

.offer-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--forest);
  color: var(--cream);
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 10px;
}

.buyer-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.buyer-card {
  background: white;
  border: 1px solid var(--cream-dark);
  border-radius: 12px;
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.buyer-card.can-respond {
  border-color: var(--coral);
  box-shadow: 0 0 0 3px rgba(232, 93, 47, 0.1);
}

.buyer-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.buyer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--sage-light);
  color: var(--forest);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 600;
  font-family: var(--font-display);
}

.buyer-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.buyer-name {
  font-weight: 500;
  color: var(--charcoal);
  font-size: 1rem;
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
  color: var(--forest);
}

.prompt-actions {
  display: flex;
  gap: var(--space-sm);
}
</style>
