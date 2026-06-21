<script setup lang="ts">
// Static explainer shown on the Open Offset Account form.
</script>

<template>
  <div class="card info">
    <span class="info__icon">🏦</span>
    <div>
      <h3>What is an Offset Account?</h3>
      <p>
        An offset account is a transaction account linked to your home loan. The
        balance in the account is used to reduce the interest charged on your
        loan.
      </p>
    </div>
  </div>
</template>

<style scoped>
.info {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  background: #f6feff;
  border: 1.5px solid var(--line);
  border-left: 5px solid var(--aqua);
}
.info__icon {
  font-size: 2rem;
  line-height: 1;
}
.info h3 {
  margin: 0 0 8px;
  color: var(--navy);
}
.info p {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}
</style>
