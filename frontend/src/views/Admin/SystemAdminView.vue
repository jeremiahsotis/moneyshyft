<template>
  <AppLayout>
    <div class="admin-system-console">
      <div class="admin-shell mx-auto max-w-[1400px] px-4 pb-12 pt-6">
        <AppBreadcrumbs :items="breadcrumbs" />

        <header class="hero-panel mt-4">
          <p class="eyebrow">System Console</p>
          <h1 class="hero-title" data-testid="system-admin-heading">System Administration</h1>
          <p class="hero-copy">
            Build and govern tenant environments with guided setup, integrity checks, and auditable controls.
          </p>
        </header>

        <section v-if="!accessStore.canAccessSystemAdmin" class="blocked-panel mt-6">
          <h2 class="blocked-title">Access denied</h2>
          <p class="blocked-copy">This workspace is restricted to system administrators.</p>
          <router-link to="/admin/tenant" class="blocked-link">Open tenant admin workspace</router-link>
        </section>

        <section v-else-if="!adminConsoleEnabled" class="blocked-panel mt-6">
          <h2 class="blocked-title">Admin console feature flag is disabled</h2>
          <p class="blocked-copy">Enable <code>VITE_ADMIN_CONSOLE_V1</code> to use this experience.</p>
        </section>

        <section v-else class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside class="system-nav">
            <button
              v-for="section in sections"
              :key="section.key"
              type="button"
              class="nav-item"
              :class="{ 'is-active': activeSection === section.key }"
              @click="activeSection = section.key"
            >
              <span class="nav-icon">{{ section.icon }}</span>
              <div>
                <p class="nav-title">{{ section.label }}</p>
                <p class="nav-note">{{ section.hint }}</p>
              </div>
            </button>
          </aside>

          <main class="content-shell">
            <section v-if="activeSection === 'tenants'" class="space-y-4">
              <div class="toolbar">
                <div class="toolbar-fields">
                  <label class="toolbar-label" for="tenant-query">Search tenants</label>
                  <input
                    id="tenant-query"
                    v-model="tenantFilters.query"
                    type="search"
                    class="toolbar-input"
                    placeholder="Search by tenant name"
                  />
                </div>

                <div class="toolbar-fields">
                  <label class="toolbar-label" for="tenant-status">Status</label>
                  <select id="tenant-status" v-model="tenantFilters.status" class="toolbar-input">
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div class="toolbar-fields">
                  <label class="toolbar-label" for="tenant-module">Module</label>
                  <select id="tenant-module" v-model="tenantFilters.module" class="toolbar-input">
                    <option value="">All</option>
                    <option value="moneyshyft">MoneyShyft</option>
                    <option value="connectshyft">ConnectShyft</option>
                  </select>
                </div>

                <div class="toolbar-actions">
                  <button type="button" class="btn-secondary" @click="loadTenants">Refresh</button>
                  <button type="button" class="btn-primary" @click="openTenantWizard">+ New Tenant</button>
                </div>
              </div>

              <div v-if="tenantsError" class="error-banner">{{ tenantsError }}</div>
              <div v-if="flashMessage" class="success-banner">{{ flashMessage }}</div>

              <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                <article class="panel p-4">
                  <header class="mb-3 flex items-center justify-between">
                    <h2 class="panel-title">Tenants</h2>
                    <span class="panel-meta">{{ tenants.length }} total</span>
                  </header>

                  <div v-if="isTenantsLoading" class="panel-placeholder">Loading tenants…</div>

                  <ul v-else class="space-y-3">
                    <li
                      v-for="tenant in tenants"
                      :key="tenant.id"
                      class="tenant-card"
                      :class="{ 'is-selected': selectedTenantId === tenant.id }"
                    >
                      <button type="button" class="tenant-open" @click="selectTenant(tenant.id)">
                        <div>
                          <p class="tenant-name">{{ tenant.name }}</p>
                          <p class="tenant-meta">
                            <span class="status-pill" :class="statusClass(tenant.status)">{{ tenant.status }}</span>
                            <span>Admins: {{ tenant.adminCount }}</span>
                            <span>Depth: {{ tenant.structureRules?.maxDepth ?? 2 }}</span>
                          </p>
                          <p class="tenant-modules">
                            Modules:
                            <span
                              v-for="module in enabledModulesForTenant(tenant)"
                              :key="`${tenant.id}-${module}`"
                              class="module-chip"
                            >
                              {{ moduleLabel(module) }}
                            </span>
                          </p>
                        </div>
                        <span class="tenant-open-label">Open</span>
                      </button>
                    </li>
                  </ul>
                </article>

                <article class="panel p-4">
                  <header class="mb-4 flex items-center justify-between">
                    <h2 class="panel-title">Tenant Detail</h2>
                    <button
                      v-if="selectedTenantId"
                      type="button"
                      class="text-link"
                      @click="loadTenantDetail(selectedTenantId)"
                    >
                      Refresh
                    </button>
                  </header>

                  <div v-if="!selectedTenantId" class="panel-placeholder">Select a tenant to manage modules, structure rules, and tenant admins.</div>
                  <div v-else-if="isTenantDetailLoading" class="panel-placeholder">Loading tenant detail…</div>
                  <div v-else-if="tenantDetailError" class="error-banner">{{ tenantDetailError }}</div>

                  <div v-else-if="selectedTenantDetail" class="space-y-5">
                    <section class="detail-group">
                      <h3 class="detail-heading">Overview</h3>
                      <p class="detail-copy">{{ selectedTenantDetail.tenant.name }} · {{ selectedTenantDetail.tenant.status }}</p>
                    </section>

                    <section class="detail-group">
                      <div class="detail-header-row">
                        <h3 class="detail-heading">Tenant Modules</h3>
                        <button type="button" class="btn-secondary" @click="saveTenantModules">Save</button>
                      </div>
                      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label v-for="module in moduleOptions" :key="module" class="toggle-card">
                          <span>
                            <strong>{{ moduleLabel(module) }}</strong>
                            <small>{{ module === 'moneyshyft' ? 'Budgeting and finance workspace' : 'Operations and routing workspace' }}</small>
                          </span>
                          <input v-model="detailModuleState[module]" type="checkbox" />
                        </label>
                      </div>
                    </section>

                    <section class="detail-group">
                      <div class="detail-header-row">
                        <h3 class="detail-heading">Structure Rules</h3>
                        <button type="button" class="btn-secondary" @click="saveTenantStructureRules">Save</button>
                      </div>

                      <label class="form-label">Maximum depth</label>
                      <div class="depth-picker">
                        <button
                          v-for="depth in [1, 2, 3, 4, 5]"
                          :key="depth"
                          type="button"
                          class="depth-pill"
                          :class="{ 'is-active': detailStructureRules.maxDepth === depth }"
                          @click="detailStructureRules.maxDepth = depth"
                        >
                          {{ depth }}
                        </button>
                      </div>

                      <label class="form-label">Allowed node types</label>
                      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <label v-for="type in nodeTypeOptions" :key="type" class="toggle-card compact">
                          <span>{{ nodeTypeLabel(type) }}</span>
                          <input
                            :checked="detailStructureRules.allowedNodeTypes.includes(type)"
                            type="checkbox"
                            @change="toggleAllowedNodeType(type, $event)"
                          />
                        </label>
                      </div>

                      <label class="toggle-row mt-3">
                        <span>
                          <strong>Allow Viewer role</strong>
                          <small>Tenant admins can assign read-only viewers.</small>
                        </span>
                        <input v-model="detailStructureRules.allowViewerRole" type="checkbox" />
                      </label>
                    </section>

                    <section class="detail-group">
                      <div class="detail-header-row">
                        <h3 class="detail-heading">Tenant Admins</h3>
                      </div>

                      <ul class="space-y-2">
                        <li
                          v-for="admin in selectedTenantDetail.tenant.admins"
                          :key="admin.id"
                          class="admin-row"
                        >
                          <div>
                            <p class="font-semibold">{{ admin.firstName }} {{ admin.lastName }}</p>
                            <p class="text-xs text-slate-500">{{ admin.email }}</p>
                          </div>
                          <button
                            type="button"
                            class="text-link danger"
                            @click="handleRemoveTenantAdmin(admin.id)"
                          >
                            Remove
                          </button>
                        </li>
                      </ul>

                      <form class="mt-3 space-y-3" @submit.prevent="handleAssignTenantAdmin">
                        <div class="segmented">
                          <button
                            type="button"
                            :class="{ 'is-active': tenantAdminForm.mode === 'select' }"
                            @click="tenantAdminForm.mode = 'select'"
                          >
                            Select existing
                          </button>
                          <button
                            type="button"
                            :class="{ 'is-active': tenantAdminForm.mode === 'create' }"
                            @click="tenantAdminForm.mode = 'create'"
                          >
                            Create new
                          </button>
                        </div>

                        <div v-if="tenantAdminForm.mode === 'select'" class="space-y-2">
                          <label class="form-label" for="admin-select-user">Choose existing user</label>
                          <select id="admin-select-user" v-model="tenantAdminForm.userId" class="toolbar-input">
                            <option value="">Select a user</option>
                            <option v-for="user in globalUsers" :key="user.id" :value="user.id">
                              {{ user.lastName }}, {{ user.firstName }} · {{ user.email }}
                            </option>
                          </select>
                        </div>

                        <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <label class="form-label" for="tenant-admin-first-name">First name</label>
                            <input id="tenant-admin-first-name" v-model="tenantAdminForm.firstName" class="toolbar-input" type="text" required />
                          </div>
                          <div>
                            <label class="form-label" for="tenant-admin-last-name">Last name</label>
                            <input id="tenant-admin-last-name" v-model="tenantAdminForm.lastName" class="toolbar-input" type="text" required />
                          </div>
                          <div class="sm:col-span-2">
                            <label class="form-label" for="tenant-admin-email">Email</label>
                            <input id="tenant-admin-email" v-model="tenantAdminForm.email" class="toolbar-input" type="email" required />
                          </div>
                          <div class="sm:col-span-2">
                            <label class="form-label" for="tenant-admin-temp-password">Temporary password</label>
                            <input id="tenant-admin-temp-password" v-model="tenantAdminForm.temporaryPassword" class="toolbar-input" type="text" required />
                          </div>
                          <label class="toggle-row sm:col-span-2">
                            <span>Force password reset on first sign-in</span>
                            <input v-model="tenantAdminForm.forceResetOnFirstLogin" type="checkbox" />
                          </label>
                        </div>

                        <button type="submit" class="btn-primary w-full">Assign Tenant Admin</button>
                      </form>
                    </section>
                  </div>
                </article>
              </div>
            </section>

            <section v-else-if="activeSection === 'users'" class="space-y-4">
              <div class="toolbar">
                <div class="toolbar-fields grow">
                  <label class="toolbar-label" for="global-user-query">Search global users</label>
                  <input
                    id="global-user-query"
                    v-model="globalUserQuery"
                    class="toolbar-input"
                    type="search"
                    placeholder="Name or email"
                    @keyup.enter="loadGlobalUsers"
                  />
                </div>
                <div class="toolbar-actions">
                  <button type="button" class="btn-secondary" @click="loadGlobalUsers">Search</button>
                </div>
              </div>

              <article class="panel p-4">
                <header class="mb-3 flex items-center justify-between">
                  <h2 class="panel-title">Global Users</h2>
                  <span class="panel-meta">{{ globalUsersTotal }} results</span>
                </header>

                <div v-if="usersError" class="error-banner">{{ usersError }}</div>
                <div v-else-if="isUsersLoading" class="panel-placeholder">Loading users…</div>
                <ul v-else class="space-y-3">
                  <li v-for="user in globalUsers" :key="user.id" class="tenant-card">
                    <div>
                      <p class="tenant-name">{{ user.firstName }} {{ user.lastName }}</p>
                      <p class="tenant-meta">
                        <span>{{ user.email }}</span>
                        <span>Role: {{ user.role }}</span>
                      </p>
                      <p class="text-xs text-slate-500">Last login: {{ formatDate(user.lastLoginAt) }}</p>
                    </div>
                  </li>
                </ul>
              </article>
            </section>

            <section v-else-if="activeSection === 'integrity'" class="space-y-4">
              <div v-if="!integrityDashboardEnabled" class="blocked-panel">
                <h2 class="blocked-title">Integrity dashboard feature flag is disabled</h2>
                <p class="blocked-copy">Enable <code>VITE_INTEGRITY_DASHBOARD_V1</code> to use this experience.</p>
              </div>

              <template v-else>
                <div class="toolbar">
                  <div class="toolbar-fields">
                    <label class="toolbar-label" for="integrity-tenant">Tenant</label>
                    <select id="integrity-tenant" v-model="integrityTenantId" class="toolbar-input" @change="loadIntegrityIssues">
                      <option value="">Select tenant</option>
                      <option v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">{{ tenant.name }}</option>
                    </select>
                  </div>
                  <div class="toolbar-actions">
                    <button type="button" class="btn-secondary" @click="loadIntegritySummary">Refresh Summary</button>
                  </div>
                </div>

                <div v-if="integrityError" class="error-banner">{{ integrityError }}</div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <article
                    v-for="item in integritySummary"
                    :key="item.tenantId"
                    class="summary-card"
                    @click="selectIntegrityTenant(item.tenantId)"
                  >
                    <h3>{{ item.tenantName }}</h3>
                    <p class="summary-total">{{ item.totalIssues }} issues</p>
                    <p class="summary-meta">
                      Critical {{ item.countsBySeverity.CRITICAL || 0 }} · Warning {{ item.countsBySeverity.WARNING || 0 }} · Info {{ item.countsBySeverity.INFO || 0 }}
                    </p>
                  </article>
                </div>

                <article class="panel p-4" v-if="integrityIssues.length > 0">
                  <header class="mb-3 flex items-center justify-between">
                    <h2 class="panel-title">Tenant Integrity Issues</h2>
                    <button type="button" class="btn-secondary" @click="loadIntegrityIssues">Refresh</button>
                  </header>

                  <ul class="space-y-3">
                    <li v-for="issue in integrityIssues" :key="issue.issueType" class="issue-group">
                      <div class="issue-header">
                        <div>
                          <p class="font-semibold">{{ formatIssueType(issue.issueType) }}</p>
                          <p class="text-xs text-slate-500">{{ issue.count }} affected items</p>
                        </div>
                        <span class="severity-pill" :class="severityClass(issue.severity)">{{ issue.severity }}</span>
                      </div>
                      <ul class="mt-2 space-y-1">
                        <li v-for="item in issue.items.slice(0, 4)" :key="item.id" class="issue-item">{{ item.label }}</li>
                      </ul>
                    </li>
                  </ul>
                </article>
              </template>
            </section>

            <section v-else-if="activeSection === 'audit'" class="space-y-4">
              <div class="toolbar">
                <div class="toolbar-fields">
                  <label class="toolbar-label" for="audit-tenant">Tenant</label>
                  <select id="audit-tenant" v-model="auditFilters.tenantId" class="toolbar-input">
                    <option value="">Select tenant</option>
                    <option v-for="tenant in tenants" :key="tenant.id" :value="tenant.id">{{ tenant.name }}</option>
                  </select>
                </div>
                <div class="toolbar-fields">
                  <label class="toolbar-label" for="audit-action">Action contains</label>
                  <input id="audit-action" v-model="auditFilters.action" class="toolbar-input" type="text" placeholder="node, tenant, role" />
                </div>
                <div class="toolbar-actions">
                  <button type="button" class="btn-secondary" @click="loadAuditEvents">Search</button>
                </div>
              </div>

              <article class="panel p-4">
                <header class="mb-3 flex items-center justify-between">
                  <h2 class="panel-title">Audit Events</h2>
                  <span class="panel-meta">{{ auditTotal }} events</span>
                </header>

                <div v-if="auditError" class="error-banner">{{ auditError }}</div>
                <div v-else-if="isAuditLoading" class="panel-placeholder">Loading events…</div>

                <ul v-else class="space-y-3">
                  <li v-for="event in auditEvents" :key="event.id" class="audit-row">
                    <div>
                      <p class="font-semibold">{{ event.eventName }}</p>
                      <p class="text-xs text-slate-500">{{ event.entityType }} · {{ formatDate(event.occurredAtUtc) }}</p>
                    </div>
                    <span class="audit-actor">{{ event.actorId ? 'User action' : 'System action' }}</span>
                  </li>
                </ul>
              </article>
            </section>
          </main>
        </section>
      </div>
    </div>

    <div v-if="wizardOpen" class="wizard-overlay" @click.self="closeTenantWizard">
      <div class="wizard-shell" role="dialog" aria-modal="true" aria-labelledby="tenant-wizard-title">
        <header class="wizard-header">
          <div>
            <p class="eyebrow">Create Tenant</p>
            <h2 id="tenant-wizard-title" class="wizard-title">Tenant Provisioning Wizard</h2>
          </div>
          <button type="button" class="wizard-close" @click="closeTenantWizard">Close</button>
        </header>

        <ol class="wizard-steps">
          <li v-for="step in wizardSteps" :key="step.step" :class="{ 'is-active': wizardStep === step.step }">
            <span>{{ step.step }}</span>
            <p>{{ step.label }}</p>
          </li>
        </ol>

        <div class="wizard-body">
          <section v-if="wizardStep === 1" class="space-y-3">
            <h3 class="wizard-section-title">Step 1: Tenant basics</h3>
            <label class="form-label" for="wizard-tenant-name">Tenant name</label>
            <input id="wizard-tenant-name" v-model="wizard.name" class="toolbar-input" type="text" placeholder="Fort Wayne District" />

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="form-label" for="wizard-tenant-status">Status</label>
                <select id="wizard-tenant-status" v-model="wizard.status" class="toolbar-input">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label class="form-label" for="wizard-billing">Billing account (optional)</label>
                <input id="wizard-billing" v-model="wizard.billingAccountName" class="toolbar-input" type="text" placeholder="North Region Finance" />
              </div>
            </div>
          </section>

          <section v-else-if="wizardStep === 2" class="space-y-3">
            <h3 class="wizard-section-title">Step 2: Choose tenant admin</h3>
            <div class="segmented">
              <button type="button" :class="{ 'is-active': wizard.adminMode === 'create' }" @click="wizard.adminMode = 'create'">Create new admin</button>
              <button type="button" :class="{ 'is-active': wizard.adminMode === 'select' }" @click="wizard.adminMode = 'select'">Select existing user</button>
            </div>

            <template v-if="wizard.adminMode === 'create'">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="form-label" for="wizard-admin-first">First name</label>
                  <input id="wizard-admin-first" v-model="wizard.adminFirstName" class="toolbar-input" type="text" />
                </div>
                <div>
                  <label class="form-label" for="wizard-admin-last">Last name</label>
                  <input id="wizard-admin-last" v-model="wizard.adminLastName" class="toolbar-input" type="text" />
                </div>
              </div>

              <label class="form-label" for="wizard-admin-email">Email</label>
              <input id="wizard-admin-email" v-model="wizard.adminEmail" class="toolbar-input" type="email" placeholder="admin@tenant.com" />

              <label class="form-label" for="wizard-admin-temp-password">Temporary password</label>
              <input id="wizard-admin-temp-password" v-model="wizard.adminTemporaryPassword" class="toolbar-input" type="text" placeholder="Set temporary password" />

              <label class="toggle-row">
                <span>
                  <strong>Force password reset on first sign-in</strong>
                  <small>Enabled by default.</small>
                </span>
                <input v-model="wizard.adminForceResetOnFirstLogin" type="checkbox" />
              </label>
            </template>

            <template v-else>
              <label class="form-label" for="wizard-user-search">Find user by name or email</label>
              <div class="flex gap-2">
                <input
                  id="wizard-user-search"
                  v-model="wizard.globalUserQuery"
                  class="toolbar-input"
                  type="search"
                  placeholder="Start typing"
                  @keyup.enter="searchWizardGlobalUsers"
                />
                <button type="button" class="btn-secondary" @click="searchWizardGlobalUsers">Search</button>
              </div>
              <select v-model="wizard.selectedGlobalUserId" class="toolbar-input">
                <option value="">Select user</option>
                <option v-for="user in wizardGlobalUsers" :key="user.id" :value="user.id">
                  {{ user.lastName }}, {{ user.firstName }} · {{ user.email }}
                </option>
              </select>
            </template>
          </section>

          <section v-else-if="wizardStep === 3" class="space-y-3">
            <h3 class="wizard-section-title">Step 3: Enable modules</h3>
            <label class="toggle-card">
              <span>
                <strong>MoneyShyft</strong>
                <small>Budgeting, accounts, transactions, and goals.</small>
              </span>
              <input v-model="wizard.moduleMoneyShyft" type="checkbox" />
            </label>

            <label class="toggle-card">
              <span>
                <strong>ConnectShyft</strong>
                <small>Messaging and operations routing.</small>
              </span>
              <input v-model="wizard.moduleConnectShyft" type="checkbox" />
            </label>
          </section>

          <section v-else-if="wizardStep === 4" class="space-y-3">
            <h3 class="wizard-section-title">Step 4: Structure rules</h3>
            <label class="form-label">Maximum depth</label>
            <div class="depth-picker">
              <button
                v-for="depth in [1, 2, 3, 4, 5]"
                :key="`wizard-depth-${depth}`"
                type="button"
                class="depth-pill"
                :class="{ 'is-active': wizard.maxDepth === depth }"
                @click="wizard.maxDepth = depth"
              >
                {{ depth }}
              </button>
            </div>

            <label class="form-label">Allowed node types</label>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label v-for="type in nodeTypeOptions" :key="`wizard-type-${type}`" class="toggle-card compact">
                <span>{{ nodeTypeLabel(type) }}</span>
                <input :checked="wizard.allowedNodeTypes.includes(type)" type="checkbox" @change="toggleWizardNodeType(type, $event)" />
              </label>
            </div>

            <label class="toggle-row">
              <span>
                <strong>Allow Viewer role</strong>
                <small>Optional read-only role for tenant staff.</small>
              </span>
              <input v-model="wizard.allowViewerRole" type="checkbox" />
            </label>
          </section>

          <p v-if="wizardError" class="error-banner">{{ wizardError }}</p>
        </div>

        <footer class="wizard-footer">
          <button type="button" class="btn-secondary" :disabled="wizardStep === 1 || wizardSubmitting" @click="wizardStep -= 1">Back</button>
          <button
            v-if="wizardStep < 4"
            type="button"
            class="btn-primary"
            :disabled="!canAdvanceWizard || wizardSubmitting"
            @click="wizardStep += 1"
          >
            Next
          </button>
          <button
            v-else
            type="button"
            class="btn-primary"
            :disabled="wizardSubmitting || !canSubmitWizard"
            @click="submitTenantWizard"
          >
            {{ wizardSubmitting ? 'Creating…' : 'Create Tenant' }}
          </button>
        </footer>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import AppBreadcrumbs from '@/components/common/AppBreadcrumbs.vue';
import { useAccessStore } from '@/stores/access';
import { useAuthStore } from '@/stores/auth';
import {
  type AdminIntegritySeverity,
  type AdminModuleKey,
  type AdminNodeType,
  type CreateTenantInput,
  type GlobalUser,
  type IntegrityIssue,
  type IntegritySummaryTenant,
  type TenantDetail,
  type TenantSummary,
  assignTenantAdmin,
  createTenant,
  getIntegrityIssues,
  getIntegritySummary,
  getTenantDetail,
  listAuditEvents,
  listGlobalUsers,
  listTenants,
  removeTenantAdmin,
  updateTenantModules,
  updateTenantStructureRules,
} from '@/services/platformAdmin';

const accessStore = useAccessStore();
const authStore = useAuthStore();

const adminConsoleEnabled = import.meta.env.VITE_ADMIN_CONSOLE_V1 !== 'false';
const integrityDashboardEnabled = import.meta.env.VITE_INTEGRITY_DASHBOARD_V1 !== 'false';

const breadcrumbs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Administration', to: '/admin' },
  { label: 'System Admin' },
];

const sections = [
  { key: 'tenants', label: 'Tenants', hint: 'Provision and govern tenant boundaries', icon: '🏢' },
  { key: 'users', label: 'Users', hint: 'Global user lookup for admin assignment', icon: '👤' },
  { key: 'integrity', label: 'Integrity', hint: 'Cross-tenant configuration health', icon: '🧭' },
  { key: 'audit', label: 'Audit', hint: 'Immutable event history', icon: '📜' },
] as const;

const activeSection = ref<(typeof sections)[number]['key']>('tenants');
const moduleOptions: AdminModuleKey[] = ['moneyshyft', 'connectshyft'];
const nodeTypeOptions: AdminNodeType[] = ['SUBTENANT', 'ORGUNIT', 'GROUP'];

const flashMessage = ref('');

const tenantFilters = reactive({
  query: '',
  status: '',
  module: '' as '' | AdminModuleKey,
});

const tenants = ref<TenantSummary[]>([]);
const isTenantsLoading = ref(false);
const tenantsError = ref('');

const selectedTenantId = ref('');
const selectedTenantDetail = ref<TenantDetail | null>(null);
const isTenantDetailLoading = ref(false);
const tenantDetailError = ref('');

const detailModuleState = reactive<Record<AdminModuleKey, boolean>>({
  moneyshyft: true,
  connectshyft: false,
});

const detailStructureRules = reactive({
  maxDepth: 2,
  allowedNodeTypes: ['SUBTENANT', 'ORGUNIT', 'GROUP'] as AdminNodeType[],
  allowViewerRole: false,
});

const tenantAdminForm = reactive({
  mode: 'select' as 'create' | 'select',
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  temporaryPassword: '',
  forceResetOnFirstLogin: true,
});

const globalUserQuery = ref('');
const globalUsers = ref<GlobalUser[]>([]);
const globalUsersTotal = ref(0);
const isUsersLoading = ref(false);
const usersError = ref('');

const integritySummary = ref<IntegritySummaryTenant[]>([]);
const integrityIssues = ref<IntegrityIssue[]>([]);
const integrityTenantId = ref('');
const integrityError = ref('');

const auditFilters = reactive({
  tenantId: '',
  action: '',
});
const auditEvents = ref<Array<{
  id: string;
  entityType: string;
  eventName: string;
  actorId: string | null;
  occurredAtUtc: string;
}>>([]);
const auditTotal = ref(0);
const isAuditLoading = ref(false);
const auditError = ref('');

const wizardOpen = ref(false);
const wizardStep = ref(1);
const wizardSubmitting = ref(false);
const wizardError = ref('');
const wizardGlobalUsers = ref<GlobalUser[]>([]);

const wizardSteps = [
  { step: 1, label: 'Basics' },
  { step: 2, label: 'Tenant Admin' },
  { step: 3, label: 'Modules' },
  { step: 4, label: 'Structure Rules' },
] as const;

const wizard = reactive({
  name: '',
  status: 'active',
  billingAccountName: '',
  adminMode: 'create' as 'create' | 'select',
  selectedGlobalUserId: '',
  globalUserQuery: '',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminTemporaryPassword: '',
  adminForceResetOnFirstLogin: true,
  moduleMoneyShyft: true,
  moduleConnectShyft: false,
  maxDepth: 2,
  allowedNodeTypes: ['SUBTENANT', 'ORGUNIT', 'GROUP'] as AdminNodeType[],
  allowViewerRole: false,
  reason: 'manual-tenant-provisioning',
});

const canAdvanceWizard = computed(() => {
  if (wizardStep.value === 1) {
    return wizard.name.trim().length > 1;
  }

  if (wizardStep.value === 2) {
    if (wizard.adminMode === 'select') {
      return wizard.selectedGlobalUserId.length > 0;
    }

    return Boolean(
      wizard.adminFirstName.trim()
      && wizard.adminLastName.trim()
      && wizard.adminEmail.trim()
      && wizard.adminTemporaryPassword.trim(),
    );
  }

  if (wizardStep.value === 3) {
    return wizard.moduleMoneyShyft || wizard.moduleConnectShyft;
  }

  return wizard.allowedNodeTypes.length > 0;
});

const canSubmitWizard = computed(() => wizard.name.trim().length > 1 && wizard.allowedNodeTypes.length > 0);

const statusClass = (status: string): string => {
  const normalized = status.toLowerCase();
  if (normalized === 'active') {
    return 'is-success';
  }
  if (normalized === 'archived') {
    return 'is-muted';
  }
  return 'is-warning';
};

const moduleLabel = (moduleKey: AdminModuleKey): string => (
  moduleKey === 'moneyshyft' ? 'MoneyShyft' : 'ConnectShyft'
);

const nodeTypeLabel = (nodeType: AdminNodeType): string => {
  if (nodeType === 'SUBTENANT') {
    return 'Sub-tenant';
  }
  if (nodeType === 'ORGUNIT') {
    return 'Org Unit';
  }
  return 'Group';
};

const severityClass = (severity: AdminIntegritySeverity): string => {
  if (severity === 'CRITICAL') {
    return 'is-critical';
  }
  if (severity === 'WARNING') {
    return 'is-warning';
  }
  return 'is-info';
};

const formatIssueType = (value: string): string => {
  return value
    .replace(/^ID-\d+_/, '')
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/\b\w/g, (char: string) => char.toUpperCase());
};

const formatDate = (value?: string): string => {
  if (!value) {
    return 'Never';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const enabledModulesForTenant = (tenant: TenantSummary): AdminModuleKey[] => {
  return tenant.moduleEntitlements
    .filter((entry) => entry.enabled)
    .map((entry) => entry.moduleKey);
};

const clearFlashLater = (): void => {
  window.setTimeout(() => {
    flashMessage.value = '';
  }, 4000);
};

const setError = (target: { value: string }, error: any, fallback: string): void => {
  target.value = error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
};

const loadTenants = async (): Promise<void> => {
  tenantsError.value = '';
  isTenantsLoading.value = true;

  try {
    const response = await listTenants({
      tenantId: authStore.user?.householdId || undefined,
      query: tenantFilters.query.trim() || undefined,
      status: tenantFilters.status || undefined,
      module: tenantFilters.module || undefined,
    });
    tenants.value = response.tenants;

    if (!selectedTenantId.value && tenants.value.length > 0) {
      selectedTenantId.value = tenants.value[0].id;
      await loadTenantDetail(selectedTenantId.value);
    }
  } catch (error: any) {
    setError(tenantsError, error, 'Failed to load tenants');
  } finally {
    isTenantsLoading.value = false;
  }
};

const selectTenant = async (tenantId: string): Promise<void> => {
  selectedTenantId.value = tenantId;
  await loadTenantDetail(tenantId);
};

const loadTenantDetail = async (tenantId: string): Promise<void> => {
  if (!tenantId) {
    return;
  }

  tenantDetailError.value = '';
  isTenantDetailLoading.value = true;

  try {
    const detail = await getTenantDetail(tenantId);
    selectedTenantDetail.value = detail;

    detailModuleState.moneyshyft = detail.tenant.moduleEntitlements.some(
      (module) => module.moduleKey === 'moneyshyft' && module.enabled,
    );
    detailModuleState.connectshyft = detail.tenant.moduleEntitlements.some(
      (module) => module.moduleKey === 'connectshyft' && module.enabled,
    );

    detailStructureRules.maxDepth = detail.tenant.structureRules.maxDepth;
    detailStructureRules.allowedNodeTypes = [...detail.tenant.structureRules.allowedNodeTypes];
    detailStructureRules.allowViewerRole = detail.tenant.structureRules.allowViewerRole;
  } catch (error: any) {
    setError(tenantDetailError, error, 'Failed to load tenant detail');
  } finally {
    isTenantDetailLoading.value = false;
  }
};

const loadGlobalUsers = async (): Promise<void> => {
  usersError.value = '';
  isUsersLoading.value = true;

  try {
    const response = await listGlobalUsers({
      tenantId: authStore.user?.householdId || undefined,
      query: globalUserQuery.value.trim() || undefined,
      page: 1,
      pageSize: 30,
    });
    globalUsers.value = response.users;
    globalUsersTotal.value = response.total;
  } catch (error: any) {
    setError(usersError, error, 'Failed to load users');
  } finally {
    isUsersLoading.value = false;
  }
};

const loadIntegritySummary = async (): Promise<void> => {
  if (!integrityDashboardEnabled) {
    return;
  }

  integrityError.value = '';
  try {
    const response = await getIntegritySummary({
      tenantId: authStore.user?.householdId || undefined,
    });
    integritySummary.value = response.tenants;

    if (!integrityTenantId.value && integritySummary.value.length > 0) {
      integrityTenantId.value = integritySummary.value[0].tenantId;
      await loadIntegrityIssues();
    }
  } catch (error: any) {
    setError(integrityError, error, 'Failed to load integrity summary');
  }
};

const selectIntegrityTenant = async (tenantId: string): Promise<void> => {
  integrityTenantId.value = tenantId;
  await loadIntegrityIssues();
};

const loadIntegrityIssues = async (): Promise<void> => {
  if (!integrityDashboardEnabled || !integrityTenantId.value) {
    integrityIssues.value = [];
    return;
  }

  integrityError.value = '';

  try {
    const response = await getIntegrityIssues({ tenantId: integrityTenantId.value });
    integrityIssues.value = response.issues;
  } catch (error: any) {
    setError(integrityError, error, 'Failed to load integrity issues');
  }
};

const loadAuditEvents = async (): Promise<void> => {
  auditError.value = '';
  isAuditLoading.value = true;

  try {
    if (!auditFilters.tenantId) {
      auditEvents.value = [];
      auditTotal.value = 0;
      return;
    }

    const response = await listAuditEvents({
      tenantId: auditFilters.tenantId,
      action: auditFilters.action.trim() || undefined,
      page: 1,
      pageSize: 40,
    });

    auditEvents.value = response.events;
    auditTotal.value = response.total;
  } catch (error: any) {
    setError(auditError, error, 'Failed to load audit events');
  } finally {
    isAuditLoading.value = false;
  }
};

const saveTenantModules = async (): Promise<void> => {
  if (!selectedTenantId.value) {
    return;
  }

  try {
    const modulesEnabled = moduleOptions.filter((moduleKey) => detailModuleState[moduleKey]);
    await updateTenantModules(selectedTenantId.value, {
      modulesEnabled,
      reason: 'admin-console-modules-save',
    });
    flashMessage.value = 'Tenant modules updated.';
    clearFlashLater();
    await Promise.all([loadTenantDetail(selectedTenantId.value), loadTenants()]);
  } catch (error: any) {
    setError(tenantDetailError, error, 'Failed to update tenant modules');
  }
};

const toggleAllowedNodeType = (type: AdminNodeType, event: Event): void => {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked && !detailStructureRules.allowedNodeTypes.includes(type)) {
    detailStructureRules.allowedNodeTypes.push(type);
  }

  if (!checked) {
    detailStructureRules.allowedNodeTypes = detailStructureRules.allowedNodeTypes.filter((value) => value !== type);
  }
};

const saveTenantStructureRules = async (): Promise<void> => {
  if (!selectedTenantId.value) {
    return;
  }

  if (detailStructureRules.allowedNodeTypes.length === 0) {
    tenantDetailError.value = 'Select at least one allowed node type.';
    return;
  }

  try {
    await updateTenantStructureRules(selectedTenantId.value, {
      maxDepth: detailStructureRules.maxDepth,
      allowedNodeTypes: detailStructureRules.allowedNodeTypes,
      allowViewerRole: detailStructureRules.allowViewerRole,
    });
    flashMessage.value = 'Tenant structure rules updated.';
    clearFlashLater();
    await Promise.all([loadTenantDetail(selectedTenantId.value), loadTenants()]);
  } catch (error: any) {
    setError(tenantDetailError, error, 'Failed to update tenant structure rules');
  }
};

const handleAssignTenantAdmin = async (): Promise<void> => {
  if (!selectedTenantId.value) {
    return;
  }

  try {
    if (tenantAdminForm.mode === 'select') {
      if (!tenantAdminForm.userId) {
        tenantDetailError.value = 'Select an existing user to assign as tenant admin.';
        return;
      }

      await assignTenantAdmin(selectedTenantId.value, {
        mode: 'select',
        userId: tenantAdminForm.userId,
        reason: 'admin-console-tenant-admin-assignment',
      });
    } else {
      await assignTenantAdmin(selectedTenantId.value, {
        mode: 'create',
        firstName: tenantAdminForm.firstName.trim(),
        lastName: tenantAdminForm.lastName.trim(),
        email: tenantAdminForm.email.trim().toLowerCase(),
        temporaryPassword: tenantAdminForm.temporaryPassword,
        forceResetOnFirstLogin: tenantAdminForm.forceResetOnFirstLogin,
        reason: 'admin-console-tenant-admin-create',
      });
    }

    tenantAdminForm.userId = '';
    tenantAdminForm.firstName = '';
    tenantAdminForm.lastName = '';
    tenantAdminForm.email = '';
    tenantAdminForm.temporaryPassword = '';

    flashMessage.value = 'Tenant admin assignment completed.';
    clearFlashLater();
    await Promise.all([loadTenantDetail(selectedTenantId.value), loadTenants(), loadGlobalUsers()]);
  } catch (error: any) {
    setError(tenantDetailError, error, 'Failed to assign tenant admin');
  }
};

const handleRemoveTenantAdmin = async (userId: string): Promise<void> => {
  if (!selectedTenantId.value) {
    return;
  }

  try {
    await removeTenantAdmin(selectedTenantId.value, userId);
    flashMessage.value = 'Tenant admin removed.';
    clearFlashLater();
    await Promise.all([loadTenantDetail(selectedTenantId.value), loadTenants()]);
  } catch (error: any) {
    setError(tenantDetailError, error, 'Failed to remove tenant admin');
  }
};

const openTenantWizard = async (): Promise<void> => {
  wizardOpen.value = true;
  wizardStep.value = 1;
  wizardError.value = '';

  if (globalUsers.value.length === 0) {
    await loadGlobalUsers();
  }

  wizardGlobalUsers.value = globalUsers.value;
};

const closeTenantWizard = (): void => {
  wizardOpen.value = false;
  wizardSubmitting.value = false;
  wizardError.value = '';
};

const searchWizardGlobalUsers = async (): Promise<void> => {
  try {
    const response = await listGlobalUsers({
      tenantId: authStore.user?.householdId || undefined,
      query: wizard.globalUserQuery.trim() || undefined,
      page: 1,
      pageSize: 30,
    });
    wizardGlobalUsers.value = response.users;
  } catch (error: any) {
    setError(wizardError, error, 'Failed to search global users');
  }
};

const toggleWizardNodeType = (type: AdminNodeType, event: Event): void => {
  const checked = (event.target as HTMLInputElement).checked;

  if (checked && !wizard.allowedNodeTypes.includes(type)) {
    wizard.allowedNodeTypes.push(type);
    return;
  }

  if (!checked) {
    wizard.allowedNodeTypes = wizard.allowedNodeTypes.filter((value) => value !== type);
  }
};

const submitTenantWizard = async (): Promise<void> => {
  wizardError.value = '';
  wizardSubmitting.value = true;

  try {
    if (!wizard.name.trim()) {
      wizardError.value = 'Tenant name is required.';
      return;
    }

    if (wizard.allowedNodeTypes.length === 0) {
      wizardError.value = 'At least one node type is required.';
      return;
    }

    const payload: CreateTenantInput = {
      name: wizard.name.trim(),
      status: wizard.status,
      billingAccountName: wizard.billingAccountName.trim() || undefined,
      tenancyModel: 'single-tenant',
      moduleGrants: {
        moneyshyft: wizard.moduleMoneyShyft,
        connectshyft: wizard.moduleConnectShyft,
      },
      reason: wizard.reason,
    };

    if (wizard.adminMode === 'select') {
      payload.assignTenantAdminUserId = wizard.selectedGlobalUserId || undefined;
    } else {
      payload.assignTenantAdminUserEmail = wizard.adminEmail.trim().toLowerCase();
      payload.assignTenantAdminFirstName = wizard.adminFirstName.trim();
      payload.assignTenantAdminLastName = wizard.adminLastName.trim();
      payload.assignTenantAdminTemporaryPassword = wizard.adminTemporaryPassword;
      payload.assignTenantAdminForceResetOnFirstLogin = wizard.adminForceResetOnFirstLogin;
    }

    const result = await createTenant(payload);
    const createdTenant = (result.tenant || result) as { id?: string; name?: string };
    const tenantId = typeof createdTenant.id === 'string' ? createdTenant.id : '';

    if (!tenantId) {
      throw new Error('Tenant created but id was missing from response');
    }

    await updateTenantStructureRules(tenantId, {
      maxDepth: wizard.maxDepth,
      allowedNodeTypes: wizard.allowedNodeTypes,
      allowViewerRole: wizard.allowViewerRole,
    });

    await updateTenantModules(tenantId, {
      modulesEnabled: [
        ...(wizard.moduleMoneyShyft ? (['moneyshyft'] as AdminModuleKey[]) : []),
        ...(wizard.moduleConnectShyft ? (['connectshyft'] as AdminModuleKey[]) : []),
      ],
      reason: 'tenant-wizard-module-sync',
    });

    flashMessage.value = `Tenant created: ${createdTenant.name || wizard.name}`;
    clearFlashLater();

    closeTenantWizard();

    wizard.name = '';
    wizard.billingAccountName = '';
    wizard.adminFirstName = '';
    wizard.adminLastName = '';
    wizard.adminEmail = '';
    wizard.adminTemporaryPassword = '';
    wizard.selectedGlobalUserId = '';
    wizard.moduleMoneyShyft = true;
    wizard.moduleConnectShyft = false;
    wizard.maxDepth = 2;
    wizard.allowedNodeTypes = ['SUBTENANT', 'ORGUNIT', 'GROUP'];
    wizard.allowViewerRole = false;

    await loadTenants();
    selectedTenantId.value = tenantId;
    await loadTenantDetail(tenantId);
  } catch (error: any) {
    setError(wizardError, error, 'Failed to create tenant');
  } finally {
    wizardSubmitting.value = false;
  }
};

watch(
  () => [tenantFilters.query, tenantFilters.status, tenantFilters.module],
  () => {
    if (activeSection.value === 'tenants') {
      void loadTenants();
    }
  },
);

watch(activeSection, (section) => {
  if (section === 'users') {
    void loadGlobalUsers();
  }

  if (section === 'integrity') {
    void loadIntegritySummary();
  }

  if (section === 'audit') {
    if (!auditFilters.tenantId) {
      auditFilters.tenantId = selectedTenantId.value || authStore.user?.householdId || '';
    }
    void loadAuditEvents();
  }
});

onMounted(async () => {
  await accessStore.refresh({ tenantId: authStore.user?.householdId || undefined });

  if (!accessStore.canAccessSystemAdmin) {
    return;
  }

  await Promise.all([loadTenants(), loadGlobalUsers()]);
});
</script>

<style scoped>
.admin-system-console {
  --admin-bg: #f7f8fa;
  --admin-surface: #ffffff;
  --admin-border: #d9dee5;
  --admin-text: #1d2433;
  --admin-muted: #5b677a;
  --admin-subtle: #7b8798;
  --admin-brand: #1f5eff;
  --admin-brand-hover: #184ed6;
  --admin-brand-subtle: #e9f0ff;
  --admin-danger: #c62828;
  --admin-danger-subtle: #fce8e6;
  --admin-success: #1e8e3e;
  --admin-success-subtle: #e6f4ea;
  --admin-warning: #b26a00;
  --admin-warning-subtle: #fff4e5;
  --admin-info: #0b57d0;
  --admin-info-subtle: #e8f0fe;
  background:
    radial-gradient(circle at 95% 5%, #d8e5ff 0%, transparent 30%),
    radial-gradient(circle at 10% 0%, #e5edf9 0%, transparent 26%),
    var(--admin-bg);
  color: var(--admin-text);
}

.hero-panel {
  border: 1px solid var(--admin-border);
  border-radius: 16px;
  padding: 20px;
  background: var(--admin-surface);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.eyebrow {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--admin-subtle);
  font-weight: 700;
}

.hero-title {
  margin: 6px 0 0;
  font-size: clamp(1.5rem, 2vw, 2.2rem);
  line-height: 1.2;
  font-weight: 700;
}

.hero-copy {
  margin: 10px 0 0;
  color: var(--admin-muted);
  max-width: 70ch;
  line-height: 1.4;
}

.blocked-panel,
.panel,
.system-nav,
.content-shell,
.wizard-shell {
  border: 1px solid var(--admin-border);
  border-radius: 16px;
  background: var(--admin-surface);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.blocked-panel {
  padding: 20px;
}

.blocked-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.blocked-copy {
  margin-top: 8px;
  color: var(--admin-muted);
}

.blocked-link {
  margin-top: 12px;
  display: inline-flex;
  color: var(--admin-brand);
  font-weight: 600;
}

.system-nav {
  padding: 10px;
  display: grid;
  gap: 8px;
  align-content: start;
  height: fit-content;
}

.nav-item {
  text-align: left;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  width: 100%;
  padding: 12px;
  min-height: 54px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.nav-item:hover,
.nav-item:focus-visible {
  background: #f2f6ff;
  border-color: #d6e2ff;
  outline: none;
}

.nav-item.is-active {
  background: var(--admin-brand-subtle);
  border-color: #bfd3ff;
}

.nav-icon {
  font-size: 1.1rem;
}

.nav-title {
  margin: 0;
  font-weight: 700;
  font-size: 0.95rem;
}

.nav-note {
  margin: 2px 0 0;
  color: var(--admin-subtle);
  font-size: 0.74rem;
  line-height: 1.3;
}

.content-shell {
  padding: 16px;
}

.toolbar {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 900px) {
  .toolbar {
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    align-items: end;
  }
}

.toolbar-fields {
  display: grid;
  gap: 6px;
}

.toolbar-label,
.form-label {
  font-size: 0.86rem;
  color: var(--admin-muted);
  font-weight: 600;
}

.toolbar-input {
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid var(--admin-border);
  background: #fff;
  padding: 0 14px;
  font-size: 1rem;
}

.toolbar-input:focus-visible {
  outline: 2px solid rgba(31, 94, 255, 0.3);
  border-color: var(--admin-brand);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  min-height: 48px;
  border-radius: 12px;
  padding: 0 16px;
  font-weight: 700;
  font-size: 0.95rem;
  border: 1px solid transparent;
  cursor: pointer;
}

.btn-primary {
  background: var(--admin-brand);
  color: #fff;
}

.btn-primary:hover,
.btn-primary:focus-visible {
  background: var(--admin-brand-hover);
  outline: none;
}

.btn-secondary {
  background: #fff;
  color: var(--admin-text);
  border-color: var(--admin-border);
}

.btn-secondary:hover,
.btn-secondary:focus-visible {
  background: #f8fafc;
  outline: none;
}

.panel-title {
  margin: 0;
  font-weight: 700;
  font-size: 1.1rem;
}

.panel-meta {
  color: var(--admin-subtle);
  font-size: 0.82rem;
}

.panel-placeholder {
  border: 1px dashed var(--admin-border);
  border-radius: 12px;
  padding: 20px;
  color: var(--admin-subtle);
  text-align: center;
}

.tenant-card {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  background: #fff;
}

.tenant-card.is-selected {
  border-color: #b6cbff;
  box-shadow: 0 0 0 2px rgba(31, 94, 255, 0.12);
}

.tenant-open {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 14px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.tenant-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.tenant-meta {
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: var(--admin-muted);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tenant-modules {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: var(--admin-subtle);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.module-chip {
  border-radius: 999px;
  border: 1px solid #d4e1ff;
  background: #f4f8ff;
  color: #214ea8;
  font-size: 0.72rem;
  padding: 2px 8px;
}

.tenant-open-label {
  min-height: 40px;
  min-width: 84px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-brand);
  color: #fff;
  font-weight: 700;
  font-size: 0.84rem;
}

.status-pill,
.severity-pill {
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid transparent;
  text-transform: capitalize;
}

.status-pill.is-success {
  background: var(--admin-success-subtle);
  color: var(--admin-success);
  border-color: #b7dfc3;
}

.status-pill.is-warning,
.severity-pill.is-warning {
  background: var(--admin-warning-subtle);
  color: var(--admin-warning);
  border-color: #f5d69f;
}

.status-pill.is-muted {
  background: #f1f5f9;
  color: #5d6677;
  border-color: #d6dde7;
}

.severity-pill.is-critical {
  background: var(--admin-danger-subtle);
  color: var(--admin-danger);
  border-color: #f4c4bf;
}

.severity-pill.is-info {
  background: var(--admin-info-subtle);
  color: var(--admin-info);
  border-color: #bfd2fb;
}

.detail-group {
  border-top: 1px solid var(--admin-border);
  padding-top: 14px;
}

.detail-heading {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.detail-copy {
  margin: 6px 0 0;
  color: var(--admin-muted);
}

.detail-header-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.toggle-card,
.toggle-row {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  min-height: 52px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.toggle-card.compact {
  min-height: 48px;
}

.toggle-card strong,
.toggle-row strong {
  display: block;
}

.toggle-card small,
.toggle-row small {
  display: block;
  color: var(--admin-subtle);
  font-size: 0.74rem;
  margin-top: 2px;
}

.toggle-card input,
.toggle-row input {
  width: 20px;
  height: 20px;
}

.depth-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.depth-pill {
  min-height: 44px;
  min-width: 44px;
  border-radius: 999px;
  border: 1px solid var(--admin-border);
  background: #fff;
  font-weight: 700;
  cursor: pointer;
}

.depth-pill.is-active {
  background: var(--admin-brand);
  color: #fff;
  border-color: var(--admin-brand);
}

.text-link {
  border: none;
  background: transparent;
  color: var(--admin-brand);
  font-weight: 700;
  cursor: pointer;
}

.text-link.danger {
  color: var(--admin-danger);
}

.admin-row {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  overflow: hidden;
}

.segmented button {
  min-height: 48px;
  border: none;
  background: #fff;
  cursor: pointer;
  font-weight: 700;
}

.segmented button.is-active {
  background: var(--admin-brand-subtle);
  color: #1748ba;
}

.summary-card {
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  padding: 14px;
  background: #fff;
  cursor: pointer;
}

.summary-card:hover {
  border-color: #c4d6ff;
  background: #fafcff;
}

.summary-card h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
}

.summary-total {
  margin: 8px 0 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.summary-meta {
  margin: 6px 0 0;
  color: var(--admin-subtle);
  font-size: 0.78rem;
}

.issue-group {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  padding: 12px;
}

.issue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.issue-item {
  color: var(--admin-muted);
  font-size: 0.84rem;
}

.audit-row {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.audit-actor {
  color: var(--admin-subtle);
  font-size: 0.78rem;
}

.error-banner,
.success-banner {
  border-radius: 12px;
  border: 1px solid transparent;
  padding: 12px 14px;
  font-size: 0.9rem;
}

.error-banner {
  border-color: #f4c4bf;
  color: var(--admin-danger);
  background: var(--admin-danger-subtle);
}

.success-banner {
  border-color: #b7dfc3;
  color: var(--admin-success);
  background: var(--admin-success-subtle);
}

.wizard-overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 60;
  padding: 20px;
}

.wizard-shell {
  width: min(860px, 100%);
  max-height: calc(100vh - 40px);
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  overflow: hidden;
}

.wizard-header {
  padding: 16px 18px;
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
}

.wizard-title {
  margin: 4px 0 0;
  font-size: 1.3rem;
  font-weight: 700;
}

.wizard-close {
  border: 1px solid var(--admin-border);
  background: #fff;
  min-height: 40px;
  border-radius: 10px;
  padding: 0 12px;
  cursor: pointer;
}

.wizard-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--admin-border);
  margin: 0;
  list-style: none;
}

.wizard-steps li {
  border-radius: 10px;
  border: 1px solid var(--admin-border);
  padding: 8px;
  background: #fff;
}

.wizard-steps li span {
  font-size: 0.75rem;
  color: var(--admin-subtle);
  font-weight: 700;
}

.wizard-steps li p {
  margin: 4px 0 0;
  font-size: 0.82rem;
  font-weight: 600;
}

.wizard-steps li.is-active {
  border-color: #bfd3ff;
  background: var(--admin-brand-subtle);
}

.wizard-body {
  padding: 16px 18px;
  overflow-y: auto;
}

.wizard-section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.wizard-footer {
  border-top: 1px solid var(--admin-border);
  padding: 12px 18px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

@media (max-width: 1023px) {
  .system-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .system-nav {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .wizard-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
