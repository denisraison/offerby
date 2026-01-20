<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppButton from '@/components/base/AppButton.vue'
import { createProduct, uploadImage } from '@/api/products'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
const description = ref('')
const price = ref('')
const errors = ref<Record<string, string>>({})
const submitting = ref(false)

interface UploadedImage {
  id: number
  path: string
}

const uploadedImages = ref<UploadedImage[]>([])
const uploading = ref(false)

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  uploading.value = true
  try {
    for (const file of input.files) {
      const result = await uploadImage(file)
      uploadedImages.value.push(result)
    }
  } catch (e) {
    errors.value.images = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

const removeImage = (id: number) => {
  uploadedImages.value = uploadedImages.value.filter(img => img.id !== id)
}

const handleSubmit = async () => {
  errors.value = {}

  if (!name.value) {
    errors.value.name = 'Name is required'
  }
  if (!price.value || Number(price.value) <= 0) {
    errors.value.price = 'Valid price is required'
  }

  if (Object.keys(errors.value).length > 0) {
    return
  }

  submitting.value = true
  try {
    await createProduct({
      name: name.value,
      description: description.value || undefined,
      price: Number(price.value),
      imageIds: uploadedImages.value.map(img => img.id),
    })
    router.push('/products')
  } catch (e) {
    errors.value.submit = e instanceof Error ? e.message : 'Failed to create product'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <PageLayout :user="authStore.user">
    <section class="page-header">
      <RouterLink to="/dashboard" class="back-link">
        <span class="back-arrow">&larr;</span>
        Back to Dashboard
      </RouterLink>
      <h1 class="page-title">List a New Item</h1>
    </section>

    <AppCard class="form-card">
      <form class="product-form" @submit.prevent="handleSubmit">
        <AppInput
          v-model="name"
          label="Product Name"
          placeholder="e.g. Vintage Eames Chair"
          :error="errors.name"
        />

        <AppInput
          v-model="description"
          label="Description"
          type="textarea"
          placeholder="Describe your item, its condition, and any notable features..."
        />

        <AppInput
          v-model="price"
          label="Asking Price (AUD)"
          type="number"
          placeholder="0"
          :error="errors.price"
        />

        <div class="image-upload">
          <label class="upload-label">Images</label>

          <div v-if="uploadedImages.length" class="image-previews">
            <div v-for="img in uploadedImages" :key="img.id" class="image-preview">
              <img :src="`http://localhost:3000${img.path}`" alt="Product image" />
              <button type="button" class="remove-btn" @click="removeImage(img.id)">
                &times;
              </button>
            </div>
          </div>

          <label class="upload-area" :class="{ disabled: uploading }">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              class="file-input"
              :disabled="uploading"
              @change="handleFileSelect"
            />
            <span class="upload-icon">+</span>
            <span class="upload-text">{{ uploading ? 'Uploading...' : 'Click to upload images' }}</span>
            <span class="upload-hint">PNG, JPG, WebP up to 5MB</span>
          </label>

          <p v-if="errors.images" class="error-text">{{ errors.images }}</p>
        </div>

        <p v-if="errors.submit" class="error-text">{{ errors.submit }}</p>

        <div class="form-actions">
          <AppButton type="button" variant="ghost" @click="router.back()">
            Cancel
          </AppButton>
          <AppButton type="submit" variant="primary" :disabled="submitting">
            {{ submitting ? 'Creating...' : 'Create Listing' }}
          </AppButton>
        </div>
      </form>
    </AppCard>
  </PageLayout>
</template>

<style scoped>
.page-header {
  max-width: 600px;
  margin: 0 auto var(--space-xl);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.875rem;
  color: var(--charcoal-soft);
  text-decoration: none;
  margin-bottom: var(--space-md);
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--charcoal);
}

.back-arrow {
  font-size: 1.125rem;
}

.page-title {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 500;
  color: var(--forest);
  letter-spacing: -0.02em;
}

.form-card {
  max-width: 600px;
  margin: 0 auto;
}

.product-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.image-upload {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.upload-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--charcoal);
}

.image-previews {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.image-preview {
  position: relative;
  width: 100px;
  height: 100px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--coral);
  color: white;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-2xl);
  background: var(--cream);
  border: 2px dashed var(--cream-dark);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}

.upload-area:hover:not(.disabled) {
  border-color: var(--sage);
  background: var(--cream-dark);
}

.upload-area.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.file-input {
  display: none;
}

.upload-icon {
  font-size: 2rem;
  color: var(--sage);
  font-weight: 300;
}

.upload-text {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--charcoal);
}

.upload-hint {
  font-size: 0.75rem;
  color: var(--charcoal-soft);
}

.error-text {
  font-size: 0.75rem;
  color: var(--coral);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: var(--space-md);
}
</style>
