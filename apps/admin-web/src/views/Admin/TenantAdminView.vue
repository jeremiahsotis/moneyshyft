<template>
  <AppLayout>
    <div class="admin-tenant-console">
      <div class="mx-auto max-w-[1400px] px-4 pb-28 pt-6 lg:pb-12">
        <AppBreadcrumbs :items="breadcrumbs" />

        <header class="hero-panel mt-4">
          <p class="eyebrow">Tenant Console</p>
          <h1 class="hero-title" data-testid="tenant-admin-heading">Tenant Administration</h1>
          <p class="hero-copy">
            Keep structure, people, and integrity healthy inside your active tenant boundary.
          </p>
        </header>

        <section v-if="!accessStore.canAccessTenantAdmin" class="blocked-panel mt-6">
          <h2 class="blocked-title">Access denied</h2>
          <p class="blocked-copy">Your role does not include tenant administration permissions.</p>
        </section>

        <section v-else-if="!adminConsoleEnabled" class="blocked-panel mt-6">
          <h2 class="blocked-title">Admin console feature flag is disabled</h2>
          <p class="blocked-copy">Enable <code>VITE_ADMIN_CONSOLE_V1</code> to use this experience.</p>
        </section>

        <section v-else class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside class="tenant-nav hidden lg:block">
            <button
              v-for="tab in tenantTabs"
              :key="tab.key"
              type="button"
              class="nav-item"
              :class="{ 'is-active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              <span class="nav-icon">{{ tab.icon }}</span>
              <div>
                <p class="nav-title">{{ tab.label }}</p>
                <p class="nav-note">{{ tab.hint }}</p>
              </div>
            </button>
          </aside>

          <main class="content-shell">
            <section v-if="activeTab === 'home'" class="space-y-4">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article class="metric-card">
                  <p class="metric-label">Critical Issues</p>
                  <p class="metric-value">{{ criticalIssueCount }}</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Total Issues</p>
                  <p class="metric-value">{{ totalIssueCount }}</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">Active Nodes</p>
                  <p class="metric-value">{{ activeNodeCount }}</p>
                </article>
                <article class="metric-card">
                  <p class="metric-label">People</p>
                  <p class="metric-value">{{ peopleTotal }}</p>
                </article>
              </div>

              <article class="panel p-4">
                <header class="mb-3">
                  <h2 class="panel-title">What needs attention</h2>
                  <p class="panel-copy">Priority actions based on current tenant integrity and structure state.</p>
                </header>

                <ul class="space-y-2">
                  <li v-for="item in homeActionItems" :key="item.label" class="home-action-row">
                    <div>
                      <p class="font-semibold">{{ item.label }}</p>
                      <p class="text-xs text-slate-500">{{ item.copy }}</p>
                    </div>
                    <button type="button" class="btn-secondary" @click="activeTab = item.nextTab">Open</button>
                  </li>
                </ul>
              </article>
            </section>

            <section v-else-if="activeTab === 'structure'" class="space-y-4">
              <div class="toolbar">
                <div class="toolbar-fields grow">
                  <label class="toolbar-label" for="structure-search">Search structure</label>
                  <input
                    id="structure-search"
                    v-model="structureSearch"
                    class="toolbar-input"
                    type="search"
                    placeholder="Search org units and groups"
                  />
                </div>
                <div class="toolbar-actions">
                  <button type="button" class="btn-secondary" @click="refreshStructure">Refresh</button>
                  <button type="button" class="btn-primary" @click="openCreateNodeModal">+ Add Node</button>
                </div>
              </div>

              <div v-if="structureError" class="error-banner">{{ structureError }}</div>
              <div v-if="flashMessage" class="success-banner">{{ flashMessage }}</div>

              <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <article class="panel p-4">
                  <header class="mb-3 flex items-center justify-between">
                    <h2 class="panel-title">Structure Tree</h2>
                    <span class="panel-meta">{{ filteredNodes.length }} nodes</span>
                  </header>

                  <div v-if="isStructureLoading" class="panel-placeholder">Loading structure…</div>
                  <ul v-else class="space-y-2">
                    <li
                      v-for="node in filteredNodes"
                      :key="node.id"
                      class="node-row"
                      :class="{ 'is-selected': selectedNodeId === node.id, 'is-archived': node.status === 'archived' }"
                    >
                      <label class="node-check">
                        <input :checked="bulkNodeIdSet.has(node.id)" type="checkbox" @change="toggleBulkNode(node.id, $event)" />
                      </label>

                      <button
                        type="button"
                        class="node-open"
                        :style="{ paddingLeft: `${Math.max(0, node.depth - 1) * 14 + 8}px` }"
                        @click="selectedNodeId = node.id"
                      >
                        <span class="node-name">{{ node.name }}</span>
                        <span class="node-meta">{{ nodeTypeLabel(node.nodeType) }} · {{ node.status }}</span>
                      </button>
                    </li>
                  </ul>

                  <div v-if="bulkNodeIds.length > 0" class="bulk-actions mt-4">
                    <h3 class="bulk-title">Bulk actions ({{ bulkNodeIds.length }})</h3>
                    <label class="form-label" for="bulk-parent">Move selected to parent</label>
                    <select id="bulk-parent" v-model="bulkMoveParentId" class="toolbar-input">
                      <option value="">Move to root</option>
                      <option v-for="option in activeNodeOptions" :key="`bulk-${option.id}`" :value="option.id">
                        {{ option.name }}
                      </option>
                    </select>
                    <button type="button" class="btn-secondary w-full" @click="handleBulkMove">Move Selected</button>

                    <label class="form-label mt-2" for="bulk-module">Bulk module toggle</label>
                    <div class="grid grid-cols-[1fr_auto_auto] gap-2">
                      <select id="bulk-module" v-model="bulkModule.moduleKey" class="toolbar-input">
                        <option value="moneyshyft">MoneyShyft</option>
                        <option value="connectshyft">ConnectShyft</option>
                      </select>
                      <label class="toggle-inline">
                        <span>Enable</span>
                        <input v-model="bulkModule.enabled" type="checkbox" />
                      </label>
                      <button type="button" class="btn-secondary" @click="handleBulkToggle">Apply</button>
                    </div>
                  </div>
                </article>

                <article class="panel p-4">
                  <header class="mb-3 flex items-center justify-between">
                    <h2 class="panel-title">Node Details</h2>
                    <button v-if="selectedNode" type="button" class="text-link" @click="selectedNodeId = ''">Clear</button>
                  </header>

                  <div v-if="!selectedNode" class="panel-placeholder">Select a node to manage module overrides, admin assignment, move, archive, or restore actions.</div>

                  <div v-else class="space-y-4">
                    <section class="detail-group">
                      <h3 class="detail-heading">{{ selectedNode.name }}</h3>
                      <p class="detail-copy">{{ nodeTypeLabel(selectedNode.nodeType) }} · {{ selectedNode.status }}</p>
                    </section>

                    <section class="detail-group">
                      <div class="detail-header-row">
                        <h3 class="detail-heading">Modules</h3>
                      </div>

                      <label class="toggle-card compact">
                        <span>
                          <strong>MoneyShyft</strong>
                          <small>Effective: {{ selectedNode.moduleEffective.moneyshyft ? 'Enabled' : 'Disabled' }}</small>
                        </span>
                        <input
                          :checked="selectedNode.moduleOverrides.moneyshyft === true"
                          type="checkbox"
                          @change="toggleNodeModule('moneyshyft', $event)"
                        />
                      </label>

                      <label class="toggle-card compact mt-2">
                        <span>
                          <strong>ConnectShyft</strong>
                          <small>Effective: {{ selectedNode.moduleEffective.connectshyft ? 'Enabled' : 'Disabled' }}</small>
                        </span>
                        <input
                          :checked="selectedNode.moduleOverrides.connectshyft === true"
                          type="checkbox"
                          @change="toggleNodeModule('connectshyft', $event)"
                        />
                      </label>
                    </section>

                    <section class="detail-group">
                      <div class="detail-header-row">
                        <h3 class="detail-heading">Admins</h3>
                        <button type="button" class="btn-secondary" @click="openAssignNodeAdminModal">Assign</button>
                      </div>
                      <ul class="space-y-2">
                        <li v-for="admin in selectedNode.admins" :key="admin.id" class="admin-row">
                          <div>
                            <p class="font-semibold">{{ admin.name }}</p>
                            <p class="text-xs text-slate-500">{{ admin.email }}</p>
                          </div>
                        </li>
                      </ul>
                    </section>

                    <section class="detail-group">
                      <h3 class="detail-heading">Move node</h3>
                      <select v-model="moveParentId" class="toolbar-input mt-2">
                        <option value="">Move to root</option>
                        <option v-for="option in activeNodeOptions" :key="`move-${option.id}`" :value="option.id">
                          {{ option.name }}
                        </option>
                      </select>
                      <button type="button" class="btn-secondary mt-2 w-full" @click="handleSingleMove">Move Node</button>
                    </section>

                    <section class="detail-group">
                      <h3 class="detail-heading">Archive / Restore</h3>
                      <p class="detail-copy">Archive is reversible. Active children must be handled first.</p>
                      <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          class="btn-secondary"
                          :disabled="selectedNode.status !== 'active'"
                          @click="handleArchiveSelectedNode"
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          class="btn-secondary"
                          :disabled="selectedNode.status !== 'archived'"
                          @click="handleRestoreSelectedNode"
                        >
                          Restore
                        </button>
                      </div>
                    </section>
                  </div>
                </article>
              </div>
            </section>

            <section v-else-if="activeTab === 'people'" class="space-y-4">
              <div class="toolbar">
                <div class="toolbar-fields grow">
                  <label class="toolbar-label" for="people-search">Search people</label>
                  <input
                    id="people-search"
                    v-model="peopleSearch"
                    class="toolbar-input"
                    type="search"
                    placeholder="Name or email"
                    @keyup.enter="refreshPeople"
                  />
                </div>
                <div class="toolbar-actions">
                  <button type="button" class="btn-secondary" @click="refreshPeople">Refresh</button>
                  <button type="button" class="btn-primary" @click="openCreatePersonModal">+ Add Person</button>
                </div>
              </div>

              <div v-if="peopleError" class="error-banner">{{ peopleError }}</div>

              <article class="panel p-4">
                <header class="mb-3 flex items-center justify-between">
                  <h2 class="panel-title">People</h2>
                  <span class="panel-meta">{{ peopleTotal }} total</span>
                </header>

                <div v-if="isPeopleLoading" class="panel-placeholder">Loading people…</div>
                <ul v-else class="space-y-3">
                  <li v-for="person in people" :key="person.id" class="person-row">
                    <div>
                      <p class="font-semibold">{{ person.firstName }} {{ person.lastName }}</p>
                      <p class="text-xs text-slate-500">{{ person.email }}</p>
                      <p class="text-xs text-slate-500">Last login: {{ formatDate(person.lastLoginAt) }}</p>
                    </div>

                    <div class="person-controls">
                      <select v-model="personDrafts[person.id].role" class="toolbar-input">
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>

                      <select v-model="personDrafts[person.id].nodeId" class="toolbar-input">
                        <option value="">No node selected</option>
                        <option v-for="option in activeNodeOptions" :key="`person-${person.id}-${option.id}`" :value="option.id">
                          {{ option.name }}
                        </option>
                      </select>

                      <div class="person-actions">
                        <button
                          type="button"
                          class="btn-secondary"
                          @click="openResetPasswordModal(person.id, person.email)"
                        >
                          Reset Password
                        </button>
                        <button type="button" class="btn-secondary" @click="savePerson(person.id)">Save</button>
                        <button type="button" class="btn-secondary" @click="archivePerson(person.id)">Archive</button>
                      </div>
                    </div>
                  </li>
                </ul>
              </article>
            </section>

            <section v-else-if="activeTab === 'integrity'" class="space-y-4">
              <div v-if="!integrityDashboardEnabled" class="blocked-panel">
                <h2 class="blocked-title">Integrity dashboard feature flag is disabled</h2>
                <p class="blocked-copy">Enable <code>VITE_INTEGRITY_DASHBOARD_V1</code> to use this experience.</p>
              </div>

              <template v-else>
                <div class="toolbar">
                  <div class="toolbar-actions">
                    <button type="button" class="btn-secondary" @click="refreshIntegrity">Refresh</button>
                  </div>
                </div>

                <div v-if="integrityError" class="error-banner">{{ integrityError }}</div>

                <article class="panel p-4">
                  <header class="mb-3">
                    <h2 class="panel-title">Issues to fix</h2>
                    <p class="panel-copy">Sorted by severity. Guided fixes are available for each issue item.</p>
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
                        <li v-for="item in issue.items.slice(0, 8)" :key="item.id" class="issue-item-row">
                          <span>{{ item.label }}</span>
                          <button type="button" class="btn-secondary" @click="openFixModal(item)">Fix</button>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </article>
              </template>
            </section>

            <section v-else-if="activeTab === 'settings'" class="space-y-4">
              <article class="panel p-4">
                <header class="mb-3">
                  <h2 class="panel-title">Tenant Settings Snapshot</h2>
                  <p class="panel-copy">System-admin governed limits for this tenant.</p>
                </header>

                <div class="space-y-3">
                  <div class="setting-row">
                    <span>Maximum depth</span>
                    <strong>{{ structureRules?.maxDepth ?? 2 }}</strong>
                  </div>
                  <div class="setting-row">
                    <span>Allowed node types</span>
                    <strong>{{ (structureRules?.allowedNodeTypes || []).map(nodeTypeLabel).join(', ') || 'None' }}</strong>
                  </div>
                  <div class="setting-row">
                    <span>Viewer role enabled</span>
                    <strong>{{ structureRules?.allowViewerRole ? 'Yes' : 'No' }}</strong>
                  </div>
                </div>
              </article>
            </section>
          </main>
        </section>
      </div>
    </div>

    <nav v-if="accessStore.canAccessTenantAdmin && adminConsoleEnabled" class="tenant-mobile-nav lg:hidden">
      <button
        v-for="tab in tenantTabs"
        :key="`mobile-${tab.key}`"
        type="button"
        class="mobile-tab"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <span>{{ tab.icon }}</span>
        <small>{{ tab.label }}</small>
      </button>
    </nav>

    <div v-if="showCreateNodeModal" class="modal-overlay" @click.self="showCreateNodeModal = false">
      <div class="modal-shell" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h3>Create Node</h3>
          <button type="button" class="btn-secondary" @click="showCreateNodeModal = false">Close</button>
        </header>

        <div class="space-y-3 p-4">
          <label class="form-label" for="new-node-type">Node type</label>
          <select id="new-node-type" v-model="createNodeForm.type" class="toolbar-input">
            <option v-for="type in allowedNodeTypeOptions" :key="type" :value="type">{{ nodeTypeLabel(type) }}</option>
          </select>

          <label class="form-label" for="new-node-name">Name</label>
          <input id="new-node-name" v-model="createNodeForm.name" class="toolbar-input" type="text" placeholder="North Region" />

          <label class="form-label" for="new-node-parent">Parent (optional)</label>
          <select id="new-node-parent" v-model="createNodeForm.parentId" class="toolbar-input">
            <option value="">Root</option>
            <option v-for="option in activeNodeOptions" :key="`new-parent-${option.id}`" :value="option.id">{{ option.name }}</option>
          </select>

          <label class="toggle-row">
            <span>
              <strong>Assign admin now</strong>
              <small>Optional guided assignment after creation.</small>
            </span>
            <input v-model="createNodeForm.assignAdmin" type="checkbox" />
          </label>

          <template v-if="createNodeForm.assignAdmin">
            <div class="segmented">
              <button type="button" :class="{ 'is-active': createNodeForm.adminMode === 'select' }" @click="createNodeForm.adminMode = 'select'">Select existing</button>
              <button type="button" :class="{ 'is-active': createNodeForm.adminMode === 'create' }" @click="createNodeForm.adminMode = 'create'">Create admin</button>
            </div>

            <div v-if="createNodeForm.adminMode === 'select'">
              <label class="form-label" for="new-node-admin-user">User</label>
              <select id="new-node-admin-user" v-model="createNodeForm.adminUserId" class="toolbar-input">
                <option value="">Select user</option>
                <option v-for="person in people" :key="`person-option-${person.id}`" :value="person.id">
                  {{ person.lastName }}, {{ person.firstName }} · {{ person.email }}
                </option>
              </select>
            </div>

            <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label class="form-label">First name</label>
                <input v-model="createNodeForm.adminFirstName" class="toolbar-input" type="text" />
              </div>
              <div>
                <label class="form-label">Last name</label>
                <input v-model="createNodeForm.adminLastName" class="toolbar-input" type="text" />
              </div>
              <div class="sm:col-span-2">
                <label class="form-label">Email</label>
                <input v-model="createNodeForm.adminEmail" class="toolbar-input" type="email" />
              </div>
              <div class="sm:col-span-2">
                <label class="form-label">Temporary password</label>
                <input v-model="createNodeForm.adminTemporaryPassword" class="toolbar-input" type="text" />
              </div>
              <label class="toggle-row sm:col-span-2">
                <span>Force reset on first sign-in</span>
                <input v-model="createNodeForm.adminForceReset" type="checkbox" />
              </label>
            </div>
          </template>

          <label class="form-label" for="new-node-reason">Reason</label>
          <input id="new-node-reason" v-model="createNodeForm.reason" class="toolbar-input" type="text" />

          <p v-if="createNodeError" class="error-banner">{{ createNodeError }}</p>
          <button type="button" class="btn-primary w-full" :disabled="createNodeSubmitting" @click="submitCreateNode">
            {{ createNodeSubmitting ? 'Creating…' : 'Create Node' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAssignAdminModal" class="modal-overlay" @click.self="showAssignAdminModal = false">
      <div class="modal-shell" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h3>Assign Node Admin</h3>
          <button type="button" class="btn-secondary" @click="showAssignAdminModal = false">Close</button>
        </header>

        <div class="space-y-3 p-4">
          <div class="segmented">
            <button type="button" :class="{ 'is-active': assignAdminForm.mode === 'select' }" @click="assignAdminForm.mode = 'select'">Select existing</button>
            <button type="button" :class="{ 'is-active': assignAdminForm.mode === 'create' }" @click="assignAdminForm.mode = 'create'">Create admin</button>
          </div>

          <div v-if="assignAdminForm.mode === 'select'">
            <label class="form-label">User</label>
            <select v-model="assignAdminForm.userId" class="toolbar-input">
              <option value="">Select user</option>
              <option v-for="person in people" :key="`assign-${person.id}`" :value="person.id">
                {{ person.lastName }}, {{ person.firstName }} · {{ person.email }}
              </option>
            </select>
          </div>

          <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label class="form-label">First name</label>
              <input v-model="assignAdminForm.firstName" class="toolbar-input" type="text" />
            </div>
            <div>
              <label class="form-label">Last name</label>
              <input v-model="assignAdminForm.lastName" class="toolbar-input" type="text" />
            </div>
            <div class="sm:col-span-2">
              <label class="form-label">Email</label>
              <input v-model="assignAdminForm.email" class="toolbar-input" type="email" />
            </div>
            <div class="sm:col-span-2">
              <label class="form-label">Temporary password</label>
              <input v-model="assignAdminForm.temporaryPassword" class="toolbar-input" type="text" />
            </div>
          </div>

          <p v-if="assignAdminError" class="error-banner">{{ assignAdminError }}</p>
          <button type="button" class="btn-primary w-full" @click="submitAssignNodeAdmin">Assign Admin</button>
        </div>
      </div>
    </div>

    <div v-if="showCreatePersonModal" class="modal-overlay" @click.self="showCreatePersonModal = false">
      <div class="modal-shell" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h3>Add Person</h3>
          <button type="button" class="btn-secondary" @click="showCreatePersonModal = false">Close</button>
        </header>

        <div class="space-y-3 p-4">
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label class="form-label" for="create-person-first">First name</label>
                <input id="create-person-first" v-model="createPersonForm.firstName" class="toolbar-input" type="text" />
              </div>
              <div>
                <label class="form-label" for="create-person-last">Last name</label>
                <input id="create-person-last" v-model="createPersonForm.lastName" class="toolbar-input" type="text" />
              </div>
            </div>

          <label class="form-label" for="create-person-email">Email</label>
          <input id="create-person-email" v-model="createPersonForm.email" class="toolbar-input" type="email" />

          <label class="form-label" for="create-person-temp-password">Temporary password</label>
          <input id="create-person-temp-password" v-model="createPersonForm.temporaryPassword" class="toolbar-input" type="text" />

          <label class="toggle-row" for="create-person-force-reset">
            <span>Force reset on first sign-in</span>
            <input id="create-person-force-reset" v-model="createPersonForm.forceResetOnFirstLogin" type="checkbox" />
          </label>

          <label class="form-label" for="create-person-role">Role</label>
          <select id="create-person-role" v-model="createPersonForm.role" class="toolbar-input">
            <option value="ADMIN">Admin</option>
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </select>

          <label class="form-label" for="create-person-node">Initial node (optional)</label>
          <select id="create-person-node" v-model="createPersonForm.nodeId" class="toolbar-input">
            <option value="">No node selected</option>
            <option v-for="option in activeNodeOptions" :key="`person-create-${option.id}`" :value="option.id">{{ option.name }}</option>
          </select>

          <p v-if="createPersonError" class="error-banner">{{ createPersonError }}</p>
          <button type="button" class="btn-primary w-full" :disabled="createPersonSubmitting" @click="submitCreatePerson">
            {{ createPersonSubmitting ? 'Adding…' : 'Add Person' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showPasswordResetModal" class="modal-overlay" @click.self="showPasswordResetModal = false">
      <div class="modal-shell" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h3>Reset Person Password</h3>
          <button type="button" class="btn-secondary" @click="showPasswordResetModal = false">Close</button>
        </header>

        <div class="space-y-3 p-4">
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Target user: <strong>{{ passwordResetForm.userEmail }}</strong>
          </div>

          <div class="segmented">
            <button
              type="button"
              :class="{ 'is-active': passwordResetForm.mode === 'temporary' }"
              @click="passwordResetForm.mode = 'temporary'"
            >
              Temporary Password
            </button>
            <button
              type="button"
              :class="{ 'is-active': passwordResetForm.mode === 'link' }"
              @click="passwordResetForm.mode = 'link'"
            >
              Reset Link
            </button>
          </div>

          <div v-if="passwordResetForm.mode === 'temporary'" class="space-y-2">
            <label class="form-label" for="password-reset-temporary-password">Temporary password</label>
            <input
              id="password-reset-temporary-password"
              v-model="passwordResetForm.temporaryPassword"
              class="toolbar-input"
              type="text"
              placeholder="At least 8 characters"
            />
          </div>

          <div v-else class="space-y-2">
            <label class="form-label" for="password-reset-base-url">Reset link base URL</label>
            <input
              id="password-reset-base-url"
              v-model="passwordResetForm.resetBaseUrl"
              class="toolbar-input"
              type="url"
              placeholder="https://admin.domain.com/auth/password/reset"
            />
            <p class="panel-copy">Leave blank to use this admin host reset route.</p>
          </div>

          <label class="form-label" for="password-reset-reason">Reason</label>
          <input
            id="password-reset-reason"
            v-model="passwordResetForm.reason"
            class="toolbar-input"
            type="text"
            placeholder="tenant-admin-password-reset"
          />

          <p v-if="passwordResetError" class="error-banner">{{ passwordResetError }}</p>

          <div
            v-if="passwordResetResultLink"
            class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 break-all"
          >
            <div class="font-semibold">Reset link created</div>
            <a :href="passwordResetResultLink" class="underline">{{ passwordResetResultLink }}</a>
          </div>

          <button
            type="button"
            class="btn-primary w-full"
            :disabled="passwordResetSubmitting"
            @click="submitPasswordReset"
          >
            {{ passwordResetSubmitting ? 'Processing…' : 'Apply Password Reset' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="fixModal.open" class="modal-overlay" @click.self="closeFixModal">
      <div class="modal-shell" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h3>Apply Guided Fix</h3>
          <button type="button" class="btn-secondary" @click="closeFixModal">Close</button>
        </header>

        <div class="space-y-3 p-4">
          <p class="text-sm text-slate-600">{{ fixModal.item?.label }}</p>
          <p class="text-xs text-slate-500">Action: {{ fixModal.actionType }}</p>

          <div v-if="fixModal.actionType === 'ASSIGN_ADMIN'" class="space-y-2">
            <label class="form-label">Assign existing user</label>
            <select v-model="fixForm.userId" class="toolbar-input">
              <option value="">Select user</option>
              <option v-for="person in people" :key="`fix-user-${person.id}`" :value="person.id">
                {{ person.lastName }}, {{ person.firstName }} · {{ person.email }}
              </option>
            </select>
          </div>

          <div v-else-if="fixModal.actionType === 'MOVE_NODE'" class="space-y-2">
            <label class="form-label">New parent</label>
            <select v-model="fixForm.newParentId" class="toolbar-input">
              <option value="">Move to root</option>
              <option v-for="option in activeNodeOptions" :key="`fix-parent-${option.id}`" :value="option.id">
                {{ option.name }}
              </option>
            </select>
          </div>

          <div v-else-if="fixModal.actionType === 'ADD_NUMBER_MAPPING'" class="space-y-2">
            <label class="form-label">Twilio number (E.164)</label>
            <input v-model="fixForm.twilioNumberE164" class="toolbar-input" type="text" placeholder="+15551234567" />
            <label class="form-label">Label</label>
            <input v-model="fixForm.label" class="toolbar-input" type="text" placeholder="Primary" />
          </div>

          <div v-else-if="fixModal.actionType === 'REASSIGN_NUMBER_MAPPING'" class="space-y-2">
            <label class="form-label">Mapping reference</label>
            <input v-model="fixForm.mappingId" class="toolbar-input" type="text" placeholder="Mapping reference" />
            <label class="form-label">New org unit</label>
            <select v-model="fixForm.newOrgUnitId" class="toolbar-input">
              <option value="">Select node</option>
              <option v-for="option in activeNodeOptions" :key="`fix-node-${option.id}`" :value="option.id">{{ option.name }}</option>
            </select>
            <label class="form-label">Twilio number (E.164)</label>
            <input v-model="fixForm.twilioNumberE164" class="toolbar-input" type="text" placeholder="+15551234567" />
          </div>

          <div v-else-if="fixModal.actionType === 'MOVE_USER'" class="space-y-2">
            <label class="form-label">Destination node</label>
            <select v-model="fixForm.newNodeId" class="toolbar-input">
              <option value="">Select node</option>
              <option v-for="option in activeNodeOptions" :key="`fix-user-node-${option.id}`" :value="option.id">{{ option.name }}</option>
            </select>
          </div>

          <p v-if="fixError" class="error-banner">{{ fixError }}</p>
          <button type="button" class="btn-primary w-full" :disabled="fixSubmitting" @click="submitFixAction">
            {{ fixSubmitting ? 'Applying…' : 'Apply Fix' }}
          </button>
        </div>
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
  type IntegrityIssue,
  type IntegrityIssueItem,
  type StructureNode,
  type TenantPeopleResponse,
  applyIntegrityFix,
  archiveStructureNode,
  assignStructureNodeAdmin,
  bulkToggleStructureNodeModules,
  createStructureNode,
  createTenantPerson,
  getIntegrityIssues,
  getStructureTree,
  listTenantPeople,
  moveStructureNodes,
  resetUserPassword,
  restoreStructureNode,
  updateStructureNodeModuleOverride,
  updateTenantPerson,
} from '@/services/platformAdmin';

const accessStore = useAccessStore();
const authStore = useAuthStore();

const adminConsoleEnabled = import.meta.env.VITE_ADMIN_CONSOLE_V1 !== 'false';
const integrityDashboardEnabled = import.meta.env.VITE_INTEGRITY_DASHBOARD_V1 !== 'false';

const breadcrumbs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Administration', to: '/admin' },
  { label: 'Tenant Admin' },
];

const tenantTabs = [
  { key: 'home', label: 'Home', hint: 'To-do and quick actions', icon: '🏠' },
  { key: 'structure', label: 'Structure', hint: 'Tree and node operations', icon: '🧱' },
  { key: 'people', label: 'People', hint: 'Members and roles', icon: '👥' },
  { key: 'integrity', label: 'Integrity', hint: 'Issue fixes', icon: '🧭' },
  { key: 'settings', label: 'Settings', hint: 'Tenant limits snapshot', icon: '⚙️' },
] as const;

const activeTab = ref<(typeof tenantTabs)[number]['key']>('home');
const tenantId = computed(
  () => authStore.user?.activeTenantId || authStore.user?.householdId || '',
);

const structureSearch = ref('');
const structureTree = ref<StructureNode[]>([]);
const flatNodes = ref<StructureNode[]>([]);
const structureRules = ref<{ maxDepth: number; allowedNodeTypes: AdminNodeType[]; allowViewerRole: boolean } | null>(null);
const isStructureLoading = ref(false);
const structureError = ref('');

const selectedNodeId = ref('');
const moveParentId = ref('');
const bulkNodeIds = ref<string[]>([]);
const bulkMoveParentId = ref('');
const bulkModule = reactive<{ moduleKey: AdminModuleKey; enabled: boolean }>({
  moduleKey: 'moneyshyft',
  enabled: true,
});

const peopleSearch = ref('');
const people = ref<TenantPeopleResponse['users']>([]);
const peopleTotal = ref(0);
const isPeopleLoading = ref(false);
const peopleError = ref('');
const personDrafts = reactive<Record<string, { role: 'ADMIN' | 'MEMBER' | 'VIEWER'; nodeId: string }>>({});

const integrityIssues = ref<IntegrityIssue[]>([]);
const integrityError = ref('');

const flashMessage = ref('');

const showCreateNodeModal = ref(false);
const createNodeSubmitting = ref(false);
const createNodeError = ref('');
const createNodeForm = reactive({
  type: 'ORGUNIT' as AdminNodeType,
  name: '',
  parentId: '',
  reason: 'manual-org-unit-create',
  assignAdmin: false,
  adminMode: 'select' as 'create' | 'select',
  adminUserId: '',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminTemporaryPassword: '',
  adminForceReset: true,
});

const showAssignAdminModal = ref(false);
const assignAdminError = ref('');
const assignAdminForm = reactive({
  mode: 'select' as 'create' | 'select',
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  temporaryPassword: '',
});

const showCreatePersonModal = ref(false);
const createPersonSubmitting = ref(false);
const createPersonError = ref('');
const createPersonForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  temporaryPassword: '',
  forceResetOnFirstLogin: true,
  role: 'MEMBER' as 'ADMIN' | 'MEMBER' | 'VIEWER',
  nodeId: '',
});

const showPasswordResetModal = ref(false);
const passwordResetSubmitting = ref(false);
const passwordResetError = ref('');
const passwordResetResultLink = ref('');
const passwordResetForm = reactive({
  userId: '',
  userEmail: '',
  mode: 'temporary' as 'temporary' | 'link',
  temporaryPassword: '',
  resetBaseUrl: '',
  reason: 'tenant-admin-password-reset',
});

const fixModal = reactive<{
  open: boolean;
  actionType: string;
  item: IntegrityIssueItem | null;
}>({
  open: false,
  actionType: '',
  item: null,
});
const fixSubmitting = ref(false);
const fixError = ref('');
const fixForm = reactive({
  userId: '',
  newParentId: '',
  newNodeId: '',
  twilioNumberE164: '',
  label: '',
  mappingId: '',
  newOrgUnitId: '',
});

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

const filteredNodes = computed(() => {
  const query = structureSearch.value.trim().toLowerCase();
  if (!query) {
    return flatNodes.value;
  }

  return flatNodes.value.filter((node) => node.name.toLowerCase().includes(query));
});

const selectedNode = computed(() => {
  return flatNodes.value.find((node) => node.id === selectedNodeId.value) || null;
});

const bulkNodeIdSet = computed(() => new Set(bulkNodeIds.value));

const activeNodeOptions = computed(() => {
  return flatNodes.value
    .filter((node) => node.status === 'active')
    .map((node) => ({ id: node.id, name: node.name }));
});

const allowedNodeTypeOptions = computed<AdminNodeType[]>(
  () => structureRules.value?.allowedNodeTypes || (['SUBTENANT', 'ORGUNIT', 'GROUP'] as AdminNodeType[]),
);

const criticalIssueCount = computed(() => integrityIssues.value.reduce((sum, issue) => sum + (issue.severity === 'CRITICAL' ? issue.count : 0), 0));
const totalIssueCount = computed(() => integrityIssues.value.reduce((sum, issue) => sum + issue.count, 0));
const activeNodeCount = computed(() => flatNodes.value.filter((node) => node.status === 'active').length);

const homeActionItems = computed(() => {
  return [
    {
      label: 'Fix integrity issues',
      copy: `${totalIssueCount.value} total issues detected`,
      nextTab: 'integrity' as const,
    },
    {
      label: 'Manage structure tree',
      copy: `${activeNodeCount.value} active nodes across this tenant`,
      nextTab: 'structure' as const,
    },
    {
      label: 'Review people and roles',
      copy: `${peopleTotal.value} people in current scope`,
      nextTab: 'people' as const,
    },
  ];
});

const clearFlashLater = (): void => {
  window.setTimeout(() => {
    flashMessage.value = '';
  }, 3500);
};

const setError = (target: { value: string }, error: any, fallback: string): void => {
  target.value = error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
};

const resetPersonDraft = (personId: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER', nodeId: string): void => {
  personDrafts[personId] = {
    role,
    nodeId,
  };
};

const roleFromRaw = (raw: string): 'ADMIN' | 'MEMBER' | 'VIEWER' => {
  const normalized = raw.trim().toUpperCase();
  if (normalized === 'TENANT_ADMIN' || normalized === 'ADMIN') {
    return 'ADMIN';
  }
  if (normalized === 'TENANT_VIEWER' || normalized === 'VIEWER') {
    return 'VIEWER';
  }
  return 'MEMBER';
};

const inferPersonNodeId = (personId: string): string => {
  const primary = flatNodes.value.find((node) => node.admins.some((admin) => admin.id === personId));
  return primary?.id || '';
};

const refreshStructure = async (): Promise<void> => {
  if (!tenantId.value) {
    return;
  }

  isStructureLoading.value = true;
  structureError.value = '';

  try {
    const response = await getStructureTree({ tenantId: tenantId.value });
    structureTree.value = response.roots;
    flatNodes.value = response.flat;
    structureRules.value = response.rules;

    if (selectedNodeId.value && !flatNodes.value.some((node) => node.id === selectedNodeId.value)) {
      selectedNodeId.value = '';
    }
  } catch (error: any) {
    setError(structureError, error, 'Failed to load structure tree');
  } finally {
    isStructureLoading.value = false;
  }
};

const refreshPeople = async (): Promise<void> => {
  if (!tenantId.value) {
    return;
  }

  isPeopleLoading.value = true;
  peopleError.value = '';

  try {
    const response = await listTenantPeople({
      tenantId: tenantId.value,
      query: peopleSearch.value.trim() || undefined,
      page: 1,
      pageSize: 40,
    });

    people.value = response.users;
    peopleTotal.value = response.total;

    for (const person of people.value) {
      resetPersonDraft(
        person.id,
        roleFromRaw(person.role),
        person.nodeId || inferPersonNodeId(person.id),
      );
    }
  } catch (error: any) {
    setError(peopleError, error, 'Failed to load people');
  } finally {
    isPeopleLoading.value = false;
  }
};

const refreshIntegrity = async (): Promise<void> => {
  if (!tenantId.value || !integrityDashboardEnabled) {
    integrityIssues.value = [];
    return;
  }

  integrityError.value = '';
  try {
    const response = await getIntegrityIssues({ tenantId: tenantId.value });
    integrityIssues.value = response.issues;
  } catch (error: any) {
    setError(integrityError, error, 'Failed to load integrity issues');
  }
};

const refreshEverything = async (): Promise<void> => {
  await Promise.all([refreshStructure(), refreshPeople(), refreshIntegrity()]);
};

const openCreateNodeModal = (): void => {
  showCreateNodeModal.value = true;
  createNodeError.value = '';
  if (selectedNode.value) {
    createNodeForm.parentId = selectedNode.value.id;
  }
};

const submitCreateNode = async (): Promise<void> => {
  if (!tenantId.value) {
    return;
  }

  createNodeError.value = '';
  createNodeSubmitting.value = true;

  try {
    if (!createNodeForm.name.trim()) {
      createNodeError.value = 'Node name is required.';
      return;
    }

    const payload: {
      tenantId: string;
      type: AdminNodeType;
      name: string;
      parentId?: string;
      reason: string;
      adminAssignment?: {
        mode: 'create' | 'select';
        userId?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        temporaryPassword?: string;
        forceResetOnFirstLogin?: boolean;
      };
    } = {
      tenantId: tenantId.value,
      type: createNodeForm.type,
      name: createNodeForm.name.trim(),
      reason: createNodeForm.reason,
      parentId: createNodeForm.parentId || undefined,
    };

    if (createNodeForm.assignAdmin) {
      if (createNodeForm.adminMode === 'select') {
        if (!createNodeForm.adminUserId) {
          createNodeError.value = 'Select a user to assign as admin.';
          return;
        }

        payload.adminAssignment = {
          mode: 'select',
          userId: createNodeForm.adminUserId,
        };
      } else {
        payload.adminAssignment = {
          mode: 'create',
          email: createNodeForm.adminEmail.trim().toLowerCase(),
          firstName: createNodeForm.adminFirstName.trim(),
          lastName: createNodeForm.adminLastName.trim(),
          temporaryPassword: createNodeForm.adminTemporaryPassword,
          forceResetOnFirstLogin: createNodeForm.adminForceReset,
        };
      }
    }

    const created = await createStructureNode(payload);
    selectedNodeId.value = created.node.id;
    showCreateNodeModal.value = false;

    createNodeForm.name = '';
    createNodeForm.parentId = '';
    createNodeForm.assignAdmin = false;
    createNodeForm.adminUserId = '';
    createNodeForm.adminEmail = '';
    createNodeForm.adminFirstName = '';
    createNodeForm.adminLastName = '';
    createNodeForm.adminTemporaryPassword = '';

    flashMessage.value = 'Node created.';
    clearFlashLater();

    await refreshEverything();
  } catch (error: any) {
    setError(createNodeError, error, 'Failed to create node');
  } finally {
    createNodeSubmitting.value = false;
  }
};

const toggleBulkNode = (nodeId: string, event: Event): void => {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked && !bulkNodeIds.value.includes(nodeId)) {
    bulkNodeIds.value = [...bulkNodeIds.value, nodeId];
  }

  if (!checked) {
    bulkNodeIds.value = bulkNodeIds.value.filter((id) => id !== nodeId);
  }
};

const handleSingleMove = async (): Promise<void> => {
  if (!tenantId.value || !selectedNode.value) {
    return;
  }

  try {
    await moveStructureNodes({
      tenantId: tenantId.value,
      nodeIds: [selectedNode.value.id],
      newParentId: moveParentId.value || null,
    });

    flashMessage.value = 'Node moved.';
    clearFlashLater();
    moveParentId.value = '';
    await refreshStructure();
  } catch (error: any) {
    setError(structureError, error, 'Failed to move node');
  }
};

const handleBulkMove = async (): Promise<void> => {
  if (!tenantId.value || bulkNodeIds.value.length === 0) {
    return;
  }

  try {
    await moveStructureNodes({
      tenantId: tenantId.value,
      nodeIds: bulkNodeIds.value,
      newParentId: bulkMoveParentId.value || null,
    });

    flashMessage.value = 'Bulk move complete.';
    clearFlashLater();
    bulkNodeIds.value = [];
    bulkMoveParentId.value = '';
    await refreshStructure();
  } catch (error: any) {
    setError(structureError, error, 'Failed to complete bulk move');
  }
};

const handleBulkToggle = async (): Promise<void> => {
  if (!tenantId.value || bulkNodeIds.value.length === 0) {
    return;
  }

  try {
    await bulkToggleStructureNodeModules({
      tenantId: tenantId.value,
      nodeIds: bulkNodeIds.value,
      moduleKey: bulkModule.moduleKey,
      enabled: bulkModule.enabled,
    });

    flashMessage.value = 'Bulk module update complete.';
    clearFlashLater();
    await refreshStructure();
  } catch (error: any) {
    setError(structureError, error, 'Failed to apply bulk module update');
  }
};

const toggleNodeModule = async (moduleKey: AdminModuleKey, event: Event): Promise<void> => {
  if (!tenantId.value || !selectedNode.value) {
    return;
  }

  const enabled = (event.target as HTMLInputElement).checked;

  try {
    await updateStructureNodeModuleOverride(selectedNode.value.id, {
      tenantId: tenantId.value,
      moduleKey,
      enabled,
    });

    flashMessage.value = `${moduleKey === 'moneyshyft' ? 'MoneyShyft' : 'ConnectShyft'} override updated.`;
    clearFlashLater();
    await refreshStructure();
  } catch (error: any) {
    setError(structureError, error, 'Failed to update node module override');
  }
};

const handleArchiveSelectedNode = async (): Promise<void> => {
  if (!tenantId.value || !selectedNode.value) {
    return;
  }

  try {
    await archiveStructureNode(selectedNode.value.id, { tenantId: tenantId.value });
    flashMessage.value = 'Node archived.';
    clearFlashLater();
    await refreshEverything();
  } catch (error: any) {
    setError(structureError, error, 'Failed to archive node');
  }
};

const handleRestoreSelectedNode = async (): Promise<void> => {
  if (!tenantId.value || !selectedNode.value) {
    return;
  }

  try {
    const response = await restoreStructureNode(selectedNode.value.id, {
      tenantId: tenantId.value,
      newParentId: moveParentId.value || undefined,
    });

    if (response.requiresParentSelection) {
      structureError.value = 'This node needs a new active parent before restore. Choose one in Move node and retry restore.';
      return;
    }

    flashMessage.value = 'Node restored.';
    clearFlashLater();
    await refreshEverything();
  } catch (error: any) {
    setError(structureError, error, 'Failed to restore node');
  }
};

const openAssignNodeAdminModal = (): void => {
  showAssignAdminModal.value = true;
  assignAdminError.value = '';
};

const submitAssignNodeAdmin = async (): Promise<void> => {
  if (!tenantId.value || !selectedNode.value) {
    return;
  }

  try {
    if (assignAdminForm.mode === 'select') {
      if (!assignAdminForm.userId) {
        assignAdminError.value = 'Select a user to assign.';
        return;
      }

      await assignStructureNodeAdmin(selectedNode.value.id, {
        tenantId: tenantId.value,
        adminAssignment: {
          mode: 'select',
          userId: assignAdminForm.userId,
        },
      });
    } else {
      await assignStructureNodeAdmin(selectedNode.value.id, {
        tenantId: tenantId.value,
        adminAssignment: {
          mode: 'create',
          email: assignAdminForm.email.trim().toLowerCase(),
          firstName: assignAdminForm.firstName.trim(),
          lastName: assignAdminForm.lastName.trim(),
          temporaryPassword: assignAdminForm.temporaryPassword,
          forceResetOnFirstLogin: true,
        },
      });
    }

    assignAdminForm.userId = '';
    assignAdminForm.firstName = '';
    assignAdminForm.lastName = '';
    assignAdminForm.email = '';
    assignAdminForm.temporaryPassword = '';

    showAssignAdminModal.value = false;
    flashMessage.value = 'Node admin assigned.';
    clearFlashLater();
    await refreshEverything();
  } catch (error: any) {
    setError(assignAdminError, error, 'Failed to assign node admin');
  }
};

const openCreatePersonModal = (): void => {
  showCreatePersonModal.value = true;
  createPersonError.value = '';
};

const resolveDefaultResetBaseUrl = (): string => `${window.location.origin}/auth/password/reset`;

const openResetPasswordModal = (userId: string, userEmail: string): void => {
  showPasswordResetModal.value = true;
  passwordResetError.value = '';
  passwordResetResultLink.value = '';
  passwordResetForm.userId = userId;
  passwordResetForm.userEmail = userEmail;
  passwordResetForm.mode = 'temporary';
  passwordResetForm.temporaryPassword = '';
  passwordResetForm.resetBaseUrl = resolveDefaultResetBaseUrl();
  passwordResetForm.reason = 'tenant-admin-password-reset';
};

const submitCreatePerson = async (): Promise<void> => {
  if (!tenantId.value) {
    return;
  }

  createPersonError.value = '';
  createPersonSubmitting.value = true;

  try {
    if (!createPersonForm.firstName.trim() || !createPersonForm.lastName.trim() || !createPersonForm.email.trim() || !createPersonForm.temporaryPassword) {
      createPersonError.value = 'First name, last name, email, and temporary password are required.';
      return;
    }

    await createTenantPerson({
      tenantId: tenantId.value,
      firstName: createPersonForm.firstName.trim(),
      lastName: createPersonForm.lastName.trim(),
      email: createPersonForm.email.trim().toLowerCase(),
      temporaryPassword: createPersonForm.temporaryPassword,
      forceResetOnFirstLogin: createPersonForm.forceResetOnFirstLogin,
      nodeId: createPersonForm.nodeId || undefined,
      role: createPersonForm.role,
    });

    createPersonForm.firstName = '';
    createPersonForm.lastName = '';
    createPersonForm.email = '';
    createPersonForm.temporaryPassword = '';
    createPersonForm.nodeId = '';
    createPersonForm.role = 'MEMBER';
    createPersonForm.forceResetOnFirstLogin = true;
    showCreatePersonModal.value = false;

    flashMessage.value = 'Person added.';
    clearFlashLater();
    await refreshPeople();
  } catch (error: any) {
    setError(createPersonError, error, 'Failed to add person');
  } finally {
    createPersonSubmitting.value = false;
  }
};

const savePerson = async (userId: string): Promise<void> => {
  if (!tenantId.value) {
    return;
  }

  const draft = personDrafts[userId];
  if (!draft) {
    return;
  }

  try {
    await updateTenantPerson(userId, {
      tenantId: tenantId.value,
      role: draft.role,
      nodeId: draft.nodeId || undefined,
    });

    flashMessage.value = 'Person updated.';
    clearFlashLater();
    await refreshPeople();
    await refreshStructure();
  } catch (error: any) {
    setError(peopleError, error, 'Failed to update person');
  }
};

const archivePerson = async (userId: string): Promise<void> => {
  if (!tenantId.value) {
    return;
  }

  try {
    await updateTenantPerson(userId, {
      tenantId: tenantId.value,
      archiveUser: true,
    });

    flashMessage.value = 'Person archived from tenant access.';
    clearFlashLater();
    await refreshPeople();
    await refreshStructure();
  } catch (error: any) {
    setError(peopleError, error, 'Failed to archive person');
  }
};

const submitPasswordReset = async (): Promise<void> => {
  if (!tenantId.value || !passwordResetForm.userId) {
    return;
  }

  passwordResetError.value = '';
  passwordResetSubmitting.value = true;
  passwordResetResultLink.value = '';

  try {
    if (!passwordResetForm.reason.trim()) {
      passwordResetError.value = 'Reason is required.';
      return;
    }

    if (passwordResetForm.mode === 'temporary' && passwordResetForm.temporaryPassword.trim().length < 8) {
      passwordResetError.value = 'Temporary password must be at least 8 characters.';
      return;
    }

    const response = await resetUserPassword({
      tenantId: tenantId.value,
      orgUnitId: personDrafts[passwordResetForm.userId]?.nodeId || undefined,
      userId: passwordResetForm.userId,
      mode: passwordResetForm.mode,
      temporaryPassword: passwordResetForm.mode === 'temporary'
        ? passwordResetForm.temporaryPassword.trim()
        : undefined,
      resetBaseUrl: passwordResetForm.mode === 'link'
        ? (passwordResetForm.resetBaseUrl.trim() || resolveDefaultResetBaseUrl())
        : undefined,
      reason: passwordResetForm.reason.trim(),
    });

    if (response.mode === 'link' && response.resetLink) {
      passwordResetResultLink.value = response.resetLink;
      flashMessage.value = 'Reset link issued.';
      clearFlashLater();
    } else {
      showPasswordResetModal.value = false;
      flashMessage.value = 'Temporary password applied. User must reset on next sign-in.';
      clearFlashLater();
    }

    await refreshPeople();
  } catch (error: any) {
    setError(passwordResetError, error, 'Failed to reset password');
  } finally {
    passwordResetSubmitting.value = false;
  }
};

const openFixModal = (item: IntegrityIssueItem): void => {
  fixModal.open = true;
  fixModal.item = item;
  fixModal.actionType = item.fixAction.actionType.toUpperCase();
  fixError.value = '';

  fixForm.userId = '';
  fixForm.newParentId = '';
  fixForm.newNodeId = '';
  fixForm.twilioNumberE164 = '';
  fixForm.label = '';
  fixForm.mappingId = '';
  fixForm.newOrgUnitId = '';

  if (typeof item.fixAction.target.mappingId === 'string') {
    fixForm.mappingId = item.fixAction.target.mappingId;
  }

  if (typeof item.fixAction.target.twilioNumberE164 === 'string') {
    fixForm.twilioNumberE164 = item.fixAction.target.twilioNumberE164;
  }
};

const closeFixModal = (): void => {
  fixModal.open = false;
  fixModal.item = null;
  fixModal.actionType = '';
  fixError.value = '';
};

const submitFixAction = async (): Promise<void> => {
  if (!tenantId.value || !fixModal.item) {
    return;
  }

  fixSubmitting.value = true;
  fixError.value = '';

  try {
    const target = {
      ...fixModal.item.fixAction.target,
    } as Record<string, unknown>;

    if (fixModal.actionType === 'ASSIGN_ADMIN' && fixForm.userId) {
      target.userId = fixForm.userId;
    }

    if (fixModal.actionType === 'MOVE_NODE') {
      target.newParentId = fixForm.newParentId || null;
    }

    if (fixModal.actionType === 'ADD_NUMBER_MAPPING') {
      target.twilioNumberE164 = fixForm.twilioNumberE164;
      target.label = fixForm.label || 'Primary';
    }

    if (fixModal.actionType === 'REASSIGN_NUMBER_MAPPING') {
      target.mappingId = fixForm.mappingId;
      target.newOrgUnitId = fixForm.newOrgUnitId;
      target.twilioNumberE164 = fixForm.twilioNumberE164;
      target.label = fixForm.label || 'Reassigned';
    }

    if (fixModal.actionType === 'MOVE_USER') {
      target.newNodeId = fixForm.newNodeId;
    }

    await applyIntegrityFix({
      tenantId: tenantId.value,
      actionType: fixModal.actionType,
      target,
    });

    closeFixModal();
    flashMessage.value = 'Integrity fix applied.';
    clearFlashLater();
    await refreshEverything();
  } catch (error: any) {
    setError(fixError, error, 'Failed to apply integrity fix');
  } finally {
    fixSubmitting.value = false;
  }
};

watch(activeTab, (tab) => {
  if (tab === 'structure') {
    void refreshStructure();
  }

  if (tab === 'people') {
    void refreshPeople();
  }

  if (tab === 'integrity') {
    void refreshIntegrity();
  }
});

onMounted(async () => {
  await accessStore.refresh({ tenantId: tenantId.value || undefined });
  if (!accessStore.canAccessTenantAdmin) {
    return;
  }

  await refreshEverything();
});
</script>

<style scoped>
.admin-tenant-console {
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
  --admin-warning: #b26a00;
  --admin-warning-subtle: #fff4e5;
  --admin-info: #0b57d0;
  --admin-info-subtle: #e8f0fe;
  background:
    radial-gradient(circle at 100% 0%, #d9e7ff 0%, transparent 32%),
    radial-gradient(circle at 0% 10%, #edf3ff 0%, transparent 28%),
    var(--admin-bg);
  color: var(--admin-text);
}

.hero-panel,
.blocked-panel,
.tenant-nav,
.content-shell,
.panel,
.modal-shell {
  border: 1px solid var(--admin-border);
  border-radius: 16px;
  background: var(--admin-surface);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.hero-panel {
  padding: 20px;
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
  font-size: clamp(1.4rem, 2vw, 2rem);
  line-height: 1.2;
  font-weight: 700;
}

.hero-copy {
  margin: 10px 0 0;
  color: var(--admin-muted);
  max-width: 70ch;
  line-height: 1.4;
}

.blocked-panel {
  padding: 20px;
}

.blocked-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.blocked-copy {
  margin-top: 8px;
  color: var(--admin-muted);
}

.tenant-nav {
  padding: 10px;
  display: grid;
  gap: 8px;
  align-content: start;
  height: fit-content;
}

.nav-item {
  text-align: left;
  width: 100%;
  border-radius: 12px;
  border: 1px solid transparent;
  min-height: 52px;
  padding: 11px;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  cursor: pointer;
  background: transparent;
}

.nav-item.is-active {
  border-color: #bfd3ff;
  background: var(--admin-brand-subtle);
}

.nav-item:hover,
.nav-item:focus-visible {
  background: #f2f6ff;
  border-color: #d6e2ff;
  outline: none;
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
  font-size: 0.74rem;
  color: var(--admin-subtle);
}

.content-shell {
  padding: 16px;
}

.metric-card {
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  padding: 14px;
  background: #fff;
}

.metric-label {
  margin: 0;
  color: var(--admin-subtle);
  font-size: 0.8rem;
}

.metric-value {
  margin: 8px 0 0;
  font-size: 1.6rem;
  font-weight: 700;
}

.home-action-row {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
}

.toolbar-fields {
  display: grid;
  gap: 6px;
  min-width: 180px;
}

.toolbar-fields.grow {
  flex: 1;
}

.toolbar-label,
.form-label {
  font-size: 0.85rem;
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
}

.btn-primary,
.btn-secondary {
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid transparent;
  padding: 0 16px;
  font-weight: 700;
  font-size: 0.9rem;
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
  border-color: var(--admin-border);
  color: var(--admin-text);
}

.btn-secondary:hover,
.btn-secondary:focus-visible {
  background: #f8fafc;
  outline: none;
}

.panel-title {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 700;
}

.panel-copy,
.panel-meta {
  margin: 5px 0 0;
  color: var(--admin-subtle);
  font-size: 0.8rem;
}

.panel-placeholder {
  border: 1px dashed var(--admin-border);
  border-radius: 12px;
  color: var(--admin-subtle);
  text-align: center;
  padding: 20px;
}

.node-row {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  padding: 4px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 4px;
}

.node-row.is-selected {
  border-color: #b6cbff;
  box-shadow: 0 0 0 2px rgba(31, 94, 255, 0.12);
}

.node-row.is-archived {
  background: #f8fafc;
}

.node-check {
  display: inline-flex;
  justify-content: center;
}

.node-open {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  min-height: 44px;
  cursor: pointer;
  display: grid;
  gap: 1px;
}

.node-name {
  font-weight: 700;
  font-size: 0.92rem;
}

.node-meta {
  color: var(--admin-subtle);
  font-size: 0.74rem;
}

.bulk-actions {
  border-top: 1px solid var(--admin-border);
  padding-top: 12px;
}

.bulk-title {
  margin: 0 0 6px;
  font-size: 0.9rem;
  font-weight: 700;
}

.toggle-inline {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  min-height: 48px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--admin-subtle);
  font-size: 0.8rem;
}

.detail-group {
  border-top: 1px solid var(--admin-border);
  padding-top: 12px;
}

.detail-heading {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.detail-copy {
  margin-top: 6px;
  color: var(--admin-muted);
  font-size: 0.84rem;
}

.detail-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
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
}

.toggle-card input,
.toggle-row input {
  width: 20px;
  height: 20px;
}

.admin-row {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  padding: 10px 12px;
}

.person-row {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

@media (min-width: 1024px) {
  .person-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 420px);
    align-items: center;
  }
}

.person-controls {
  display: grid;
  gap: 8px;
}

.person-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
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

.issue-item-row {
  border: 1px solid var(--admin-border);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 0.86rem;
}

.severity-pill {
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid transparent;
}

.severity-pill.is-critical {
  background: var(--admin-danger-subtle);
  color: var(--admin-danger);
  border-color: #f4c4bf;
}

.severity-pill.is-warning {
  background: var(--admin-warning-subtle);
  color: var(--admin-warning);
  border-color: #f5d69f;
}

.severity-pill.is-info {
  background: var(--admin-info-subtle);
  color: var(--admin-info);
  border-color: #bfd2fb;
}

.setting-row {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--admin-muted);
}

.setting-row strong {
  color: var(--admin-text);
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
  color: #1e8e3e;
  background: #e6f4ea;
}

.tenant-mobile-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  border-top: 1px solid var(--admin-border);
  background: #fff;
  padding: 6px 8px calc(env(safe-area-inset-bottom) + 8px);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  z-index: 50;
}

.mobile-tab {
  border: 1px solid transparent;
  border-radius: 10px;
  min-height: 52px;
  background: transparent;
  color: var(--admin-subtle);
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 2px;
  font-size: 0.9rem;
}

.mobile-tab small {
  font-size: 0.67rem;
  font-weight: 700;
}

.mobile-tab.is-active {
  border-color: #bfd3ff;
  background: var(--admin-brand-subtle);
  color: #1748ba;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 24, 40, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 70;
}

.modal-shell {
  width: min(640px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

.modal-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--admin-border);
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 700;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  overflow: hidden;
}

.segmented button {
  border: none;
  min-height: 48px;
  background: #fff;
  font-weight: 700;
  cursor: pointer;
}

.segmented button.is-active {
  background: var(--admin-brand-subtle);
  color: #1748ba;
}
</style>
