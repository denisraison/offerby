<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppAvatar from '@/components/base/AppAvatar.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const props = defineProps<{
  user?: {
    name: string
    email: string
    avatar?: string
  }
}>()

const emailInitials = computed(() => props.user?.email.slice(0, 2) ?? '')

const route = useRoute()

const navLinks = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/products', label: 'Browse' },
]

const isActive = (path: string) => route.path.startsWith(path)
</script>

<template>
  <header class="app-header">
    <RouterLink to="/dashboard" class="logo">
      <span class="logo-mark">O</span>
      <span class="logo-text">fferBy</span>
    </RouterLink>

    <nav class="nav">
      <RouterLink
        v-for="link in navLinks"
        :key="link.path"
        :to="link.path"
        class="nav-link"
        :class="{ active: isActive(link.path) }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <div v-if="user" class="user-menu">
      <span class="user-name">{{ user.name }}</span>
      <AppAvatar :name="user.name" :src="user.avatar" :initials="emailInitials" />
      <button class="logout-btn" @click="handleLogout">Logout</button>
    </div>
    <div v-else class="auth-links">
      <RouterLink to="/login" class="nav-link">Log in</RouterLink>
      <RouterLink to="/register" class="register-link">Register</RouterLink>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-xl);
  background: rgba(247, 244, 239, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(26, 47, 35, 0.06);
}

.logo {
  display: flex;
  align-items: baseline;
  gap: 2px;
  text-decoration: none;
}

.logo-mark {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 600;
  color: var(--forest);
  line-height: 1;
}

.logo-text {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--forest);
  letter-spacing: -0.02em;
}

.nav {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--space-xl);
}

.nav-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--charcoal-soft);
  text-decoration: none;
  padding: var(--space-sm) 0;
  position: relative;
  transition: color 0.2s var(--ease-out);
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--coral);
  transition: width 0.3s var(--ease-out);
}

.nav-link:hover,
.nav-link.active {
  color: var(--charcoal);
}

.nav-link.active::after,
.nav-link:hover::after {
  width: 100%;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--charcoal);
}

.logout-btn {
  padding: var(--space-sm) var(--space-md);
  background: transparent;
  border: 1px solid var(--charcoal-soft);
  color: var(--charcoal-soft);
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.3s var(--ease-out);
}

.logout-btn:hover {
  border-color: var(--charcoal);
  color: var(--charcoal);
}

.auth-links {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.register-link {
  padding: var(--space-sm) var(--space-md);
  background: var(--coral);
  color: white;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 100px;
  transition: all 0.3s var(--ease-out);
}

.register-link:hover {
  background: var(--forest);
}

@media (max-width: 768px) {
  .app-header {
    flex-wrap: wrap;
    gap: var(--space-md);
  }

  .nav {
    order: 3;
    width: 100%;
    justify-content: center;
  }
}
</style>
