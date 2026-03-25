<template>
  <div class="space-y-4">
    <section class="mx-auto max-w-7xl px-4 sm:px-6">
      <SurfaceCard tone="soft" padding="compact" panel>
        <SectionHeader
          eyebrow="ConnectShyft"
          title="Conversations"
          description="Inbox, directory, and conversations stay together here."
          size="md"
        />
      </SurfaceCard>

      <div class="mt-4">
        <ConnectShyftPrimaryNav />
      </div>
    </section>

    <RouterView />
  </div>
</template>

<script setup lang="ts">
import ConnectShyftPrimaryNav from '@/components/connectshyft/ConnectShyftPrimaryNav.vue';
import SectionHeader from '@/components/ui/SectionHeader.vue';
import SurfaceCard from '@/components/ui/SurfaceCard.vue';
</script>
