<script setup lang="ts">
export type RedrawPurpose =
  | ''
  | 'property'
  | 'construction'
  | 'third-party'
  | 'personal'
  | 'other'

const purpose = defineModel<RedrawPurpose>('purpose', { required: true })
const reason = defineModel<string>('reason', { required: true })

const options = [
  { value: 'property', icon: '🏠', label: 'Property Purchase / Settlement' },
  { value: 'construction', icon: '🔨', label: 'Construction / Renovation' },
  { value: 'third-party', icon: '🏢', label: 'Transfer To Third Party' },
  { value: 'personal', icon: '👤', label: 'Transfer To My Own Account' },
  { value: 'other', icon: '📄', label: 'Other' },
] as const
</script>

<template>
  <section class="card">
    <h2>Why are you requesting this redraw?</h2>

    <div class="purposes">
      <button
        v-for="o in options"
        :key="o.value"
        type="button"
        class="purpose"
        :class="{ 'is-selected': purpose === o.value }"
        @click="purpose = o.value"
      >
        <span class="purpose__icon">{{ o.icon }}</span>
        <span class="purpose__label">{{ o.label }}</span>
      </button>
    </div>

    <label class="field" style="margin-top: 28px">
      <span>Redraw Reason <span class="req">*</span></span>
      <textarea
        v-model="reason"
        rows="4"
        placeholder="Please tell us how the funds will be used."
      />
    </label>
  </section>
</template>

<style scoped>
.req {
  color: #d92d20;
}
.purposes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}
.purpose {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 20px;
  border: 2px solid var(--line);
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: all 0.15s ease;
  min-height: 110px;
}
.purpose:hover {
  border-color: var(--blue);
}
.purpose.is-selected {
  border-color: var(--blue);
  background: var(--blue);
  color: #fff;
}
.purpose__icon {
  font-size: 1.8rem;
  line-height: 1;
}
.purpose__label {
  font-weight: 600;
  font-size: 0.98rem;
  color: var(--navy);
}
.purpose.is-selected .purpose__label {
  color: #fff;
}
</style>
