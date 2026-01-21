<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppButton from '@/components/base/AppButton.vue'
import ProductCard from '@/components/domain/ProductCard.vue'
import { getProducts } from '@/api/products'
import { resolveImageUrl } from '@/api/client'
import type { ProductListItem } from '@/types/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const searchQuery = ref('')
const statusFilter = ref<'available' | 'reserved' | undefined>(undefined)
const products = ref<ProductListItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function fetchProducts(status?: 'available' | 'reserved') {
  loading.value = true
  error.value = null
  try {
    products.value = (await getProducts(status)).items
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load products'
  } finally {
    loading.value = false
  }
}

function setStatusFilter(status: 'available' | 'reserved' | undefined) {
  if (statusFilter.value === status) return
  statusFilter.value = status
  fetchProducts(status)
}

onMounted(() => fetchProducts())

const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value
  const query = searchQuery.value.toLowerCase()
  return products.value.filter(p => p.name.toLowerCase().includes(query))
})
</script>

<template>
  <PageLayout :user="authStore.user ?? undefined">
    <section class="page-header">
      <div class="header-text">
        <h1 class="page-title">Browse</h1>
        <p class="page-subtitle">Discover unique items from sellers near you</p>
      </div>
      <div class="header-actions">
        <div class="filter-bar">
          <div class="search-wrapper">
            <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search products..."
              class="search-input"
            />
          </div>
          <div class="filter-divider" />
          <div class="status-filter">
            <div
              class="filter-indicator"
              :class="{
                'pos-all': statusFilter === undefined,
                'pos-available': statusFilter === 'available',
                'pos-reserved': statusFilter === 'reserved'
              }"
            />
            <button
              class="filter-option"
              :class="{ active: statusFilter === undefined }"
              @click="setStatusFilter(undefined)"
            >
              All
            </button>
            <button
              class="filter-option"
              :class="{ active: statusFilter === 'available' }"
              @click="setStatusFilter('available')"
            >
              Available
            </button>
            <button
              class="filter-option"
              :class="{ active: statusFilter === 'reserved' }"
              @click="setStatusFilter('reserved')"
            >
              Reserved
            </button>
          </div>
        </div>
        <AppButton variant="primary" @click="router.push('/products/new')">
          + Sell New Item
        </AppButton>
      </div>
    </section>

    <div v-if="loading" class="loading">Loading products...</div>

    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <section class="products-grid">
        <RouterLink
          v-for="product in filteredProducts"
          :key="product.id"
          :to="`/products/${product.id}`"
          class="product-link"
        >
          <ProductCard
            :name="product.name"
            :price="product.price"
            :status="product.status"
            :image="resolveImageUrl(product.image)"
            :offers="0"
            :seller-name="product.sellerName"
          />
        </RouterLink>
      </section>

      <p v-if="filteredProducts.length === 0" class="no-results">
        No products found matching "{{ searchQuery }}"
      </p>
    </template>
  </PageLayout>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-xl);
  margin-bottom: var(--space-2xl);
}

.page-title {
  font-family: var(--font-display);
  font-size: 3rem;
  font-weight: 500;
  color: var(--forest);
  line-height: 1;
  letter-spacing: -0.03em;
  margin-bottom: var(--space-xs);
}

.page-subtitle {
  font-size: 0.9375rem;
  color: var(--charcoal-soft);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.filter-bar {
  display: flex;
  align-items: center;
  background: white;
  border: 1.5px solid var(--cream-dark);
  border-radius: 14px;
  padding: 6px;
  gap: 0;
  box-shadow: 0 1px 3px rgba(26, 47, 35, 0.04);
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 0 var(--space-md);
  min-width: 220px;
}

.search-icon {
  color: var(--charcoal-soft);
  flex-shrink: 0;
  opacity: 0.6;
}

.search-input {
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  color: var(--charcoal);
  width: 100%;
  padding: var(--space-sm) 0;
}

.search-input::placeholder {
  color: var(--charcoal-soft);
  opacity: 0.7;
}

.search-input:focus {
  outline: none;
}

.filter-divider {
  width: 1px;
  height: 24px;
  background: var(--cream-dark);
  flex-shrink: 0;
}

.status-filter {
  display: flex;
  align-items: center;
  position: relative;
  padding: 0 4px;
}

.filter-indicator {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: calc(100% - 4px);
  background: var(--forest);
  border-radius: 8px;
  transition: all 0.3s var(--ease-out);
  z-index: 0;
}

.filter-indicator.pos-all {
  left: 4px;
  width: 39px;
}

.filter-indicator.pos-available {
  left: 43px;
  width: 79px;
}

.filter-indicator.pos-reserved {
  left: 122px;
  width: 81px;
}

.filter-option {
  position: relative;
  z-index: 1;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--charcoal-soft);
  padding: 8px 12px;
  cursor: pointer;
  transition: color 0.2s ease;
  white-space: nowrap;
}

.filter-option:hover:not(.active) {
  color: var(--charcoal);
}

.filter-option.active {
  color: white;
}

.filter-option:focus-visible {
  outline: 2px solid var(--coral);
  outline-offset: 2px;
  border-radius: 6px;
}

.filter-bar:focus-within {
  border-color: var(--forest);
  box-shadow: 0 0 0 3px rgba(26, 47, 35, 0.08);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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

.no-results {
  text-align: center;
  color: var(--charcoal-soft);
  padding: var(--space-2xl);
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-lg);
  }

  .header-actions {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-md);
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    padding: var(--space-sm);
    gap: var(--space-sm);
  }

  .search-wrapper {
    min-width: unset;
    width: 100%;
  }

  .filter-divider {
    width: 100%;
    height: 1px;
  }

  .status-filter {
    width: 100%;
    justify-content: center;
  }

  .filter-indicator.pos-all {
    left: calc(50% - 97px);
  }

  .filter-indicator.pos-available {
    left: calc(50% - 51px);
  }

  .filter-indicator.pos-reserved {
    left: calc(50% + 29px);
  }

  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
