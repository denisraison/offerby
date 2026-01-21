<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore, ApiError } from '@/stores/auth'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import AppCard from '@/components/base/AppCard.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  if (!email.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }

  error.value = ''
  loading.value = true

  try {
    await authStore.login(email.value, password.value)
    const redirect = route.query.redirect as string | undefined
    const safeRedirect = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/products'
    router.push(safeRedirect)
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = 'An unexpected error occurred'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="ambient-bg" />

    <div class="login-container">
      <RouterLink to="/" class="logo">
        <span class="logo-mark">O</span>
        <span class="logo-text">fferBy</span>
      </RouterLink>

      <AppCard class="login-card">
        <h1 class="login-title">Welcome back</h1>
        <p class="login-subtitle">Sign in to continue to your account</p>

        <form class="login-form" @submit.prevent="handleLogin">
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
            placeholder="Enter your password"
            :error="error"
          />

          <AppButton type="submit" variant="primary" class="login-button" :disabled="loading">
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </AppButton>
        </form>

        <p class="login-footer">
          Don't have an account?
          <RouterLink to="/register" class="link">Create one</RouterLink>
        </p>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: var(--space-xl);
}

.login-container {
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

.login-card {
  width: 100%;
}

.login-card :deep(.card-body) {
  padding: var(--space-2xl);
}

.login-title {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 500;
  color: var(--forest);
  margin-bottom: var(--space-xs);
}

.login-subtitle {
  font-size: 0.9375rem;
  color: var(--charcoal-soft);
  margin-bottom: var(--space-xl);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.login-button {
  width: 100%;
  margin-top: var(--space-sm);
}

.login-footer {
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
