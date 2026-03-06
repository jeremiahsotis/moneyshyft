<template>
  <nav aria-label="Breadcrumb" data-testid="admin-breadcrumbs">
    <ol class="flex flex-wrap items-center gap-2 text-sm text-gray-600">
      <li v-for="(item, index) in items" :key="`${item.label}-${index}`" class="flex items-center gap-2">
        <router-link
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="hover:text-primary-700 hover:underline"
        >
          {{ item.label }}
        </router-link>
        <span v-else class="font-medium text-gray-900">{{ item.label }}</span>
        <span v-if="index < items.length - 1" class="text-gray-400">/</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
type BreadcrumbItem = {
  label: string;
  to?: string;
};

defineProps<{
  items: BreadcrumbItem[];
}>();
</script>
