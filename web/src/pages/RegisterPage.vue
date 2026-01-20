<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppCard from '@/components/base/AppCard.vue'
import { useAuthStore, ApiError } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleRegister = async () => {
  if (!name.value || !email.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }

  error.value = ''
  loading.value = true

  try {
    await authStore.register(email.value, password.value, name.value)
    router.push('/dashboard')
  } catch (e) {
    if (e instanceof ApiError) {
      error.value = e.message
    } else {
      error.value = 'Registration failed. Please try again.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <div class="ambient-bg" />

    <div class="register-container">
      <RouterLink to="/" class="logo">
        <span class="logo-mark">O</span>
        <span class="logo-text">fferBy</span>
      </RouterLink>

      <AppCard class="register-card">
        <h1 class="register-title">Create an account</h1>
        <p class="register-subtitle">Join OfferBy and start buying or selling</p>

        <form class="register-form" @submit.prevent="handleRegister">
          <AppInput
            v-model="name"
            label="Full name"
            placeholder="Your name"
          />
          <AppInput
            v-model="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
          />
          <AppInput
            v-model="password"
            label="Password"
            type="password"
            placeholder="Create a password"
            :error="error"
          />

          <AppButton type="submit" variant="primary" class="register-button" :disabled="loading">
            {{ loading ? 'Creating account...' : 'Create account' }}
          </AppButton>
        </form>

        <p class="register-footer">
          Already have an account?
          <RouterLink to="/login" class="link">Sign in</RouterLink>
        </p>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: var(--space-xl);
}

.register-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
}

.logo {
  display: flex;
  align-items: baseline;
  gap: 2px;
  text-decoration: none;
}

.logo-mark {
  font-family: var(--font-display);
  font-size: 3rem;
  font-weight: 600;
  color: var(--forest);
  line-height: 1;
}

.logo-text {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 400;
  color: var(--forest);
  letter-spacing: -0.02em;
}

.register-card {
  width: 100%;
}

.register-card :deep(.card-body) {
  padding: var(--space-2xl);
}

.register-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 500;
  color: var(--forest);
  margin-bottom: var(--space-xs);
}

.register-subtitle {
  font-size: 0.9375rem;
  color: var(--charcoal-soft);
  margin-bottom: var(--space-xl);
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.register-button {
  width: 100%;
  margin-top: var(--space-sm);
}

.register-footer {
  margin-top: var(--space-xl);
  text-align: center;
  font-size: 0.875rem;
  color: var(--charcoal-soft);
}

.link {
  color: var(--coral);
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}
</style>
