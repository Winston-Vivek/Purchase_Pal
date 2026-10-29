<script setup lang="ts">
import { Upload } from '@lucide/vue';
import { ref } from 'vue';

/** BR-10, mirrored on the client so a doomed upload is refused before it is
 *  sent. The API checks again, including the magic bytes, which a browser
 *  cannot see. */
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const emit = defineEmits<{ select: [File] }>();

const error = ref<string | null>(null);
const input = ref<HTMLInputElement | null>(null);

function accept(files: FileList | File[] | null): void {
  error.value = null;
  const file = files?.[0];
  if (!file) return;

  if (!ACCEPTED.includes(file.type)) {
    error.value = 'Choose a PDF, JPG, PNG or WEBP file.';
    return;
  }

  if (file.size > MAX_BYTES) {
    error.value = 'That file is too large. The limit is 5 MB.';
    return;
  }

  emit('select', file);
}

defineExpose({ accept });
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      class="flex flex-col items-center gap-2 rounded-md border border-dashed border-input bg-surface px-4 py-8 text-center"
      @dragover.prevent
      @drop.prevent="accept($event.dataTransfer?.files ?? null)"
    >
      <Upload :size="20" aria-hidden="true" class="text-muted-fg" />
      <p class="font-semibold text-fg">Drop the invoice here, or choose a file</p>

      <button
        type="button"
        class="min-h-11 cursor-pointer rounded-md px-4 font-semibold text-primary hover:bg-primary-tint focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        @click="input?.click()"
      >
        Choose a file
      </button>

      <!-- The rules are stated up front, not discovered by failing. -->
      <p class="text-sm text-muted-fg">PDF, JPG, PNG or WEBP · up to 5 MB · max 5 files</p>

      <input
        ref="input"
        type="file"
        class="sr-only"
        :accept="ACCEPTED.join(',')"
        @change="accept(($event.target as HTMLInputElement).files)"
      />
    </div>

    <p v-if="error" role="alert" class="text-sm font-semibold text-danger">{{ error }}</p>
  </div>
</template>
