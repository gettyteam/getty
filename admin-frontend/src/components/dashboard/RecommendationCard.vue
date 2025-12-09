<template>
  <div
    class="recommendation-card bg-card text-card-foreground rounded-md shadow-sm p-4 flex flex-col w-full md:w-[16rem] min-h-[16rem]"
    style="border: 1px solid var(--card-border)">
    <div class="card-header flex items-center gap-3 mb-4">
      <i :class="[module.icon, 'text-2xl']"></i>
      <h3 class="text-xl font-semibold">
        {{ $t(`home.recommendations.modules.${module.id}.title`, module.name) }}
      </h3>
    </div>
    <div class="card-content flex-1 flex flex-col justify-between">
      <p class="text-muted-foreground mb-4">
        {{ $t(`home.recommendations.modules.${module.id}.description`, module.description) }}
      </p>
      <button
        @click="$emit('configure', module)"
        class="btn btn-secondary btn-compact-secondary self-center px-6 justify-center hover:bg-[#553fee] hover:text-white transition-colors">
        {{ $t('home.actions.configure') }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  module: { type: Object, required: true },
});
defineEmits(['configure']);
</script>
