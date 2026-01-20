<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppInput from '@/components/base/AppInput.vue'
import ProductCard from '@/components/domain/ProductCard.vue'
import { getProducts } from '@/api/products'
import { resolveImageUrl } from '@/api/client'
import type { ProductListItem } from '@/types/api'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const searchQuery = ref('')
const products = ref<ProductListItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    products.value = await getProducts()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load products'
  } finally {
    loading.value = false
  }
})

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
      <div class="search-wrapper">
        <AppInput
          v-model="searchQuery"
          placeholder="Search products..."
          class="search-input"
        />
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

.search-wrapper {
  width: 300px;
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-wrapper {
    width: 100%;
  }

  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
