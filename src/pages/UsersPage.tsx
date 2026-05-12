import { useState } from 'react'
import { Link } from 'react-router-dom'
import { updateLocalUser } from '../lib/localDb'
import { useUsers } from '../hooks/useUsers'
import { useAuthStore } from '../store/authStore'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { Modal } from '../components/Modal'
import { UserFormModal } from '../components/UserFormModal'
import { toastSuccess, toastError } from '../lib/toast'
import { formatDate } from '../utils/format'
import { useT } from '../i18n'
import type { UserProfile } from '../hooks/useUsers'

export function UsersPage() {
  const t = useT()
  const currentUser = useAuthStore((state) => state.user)
  const { users, loading, refetch } = useUsers()

  const [formOpen, setFormOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserProfile | null>(null)
  const [confirmUser, setConfirmUser] = useState<UserProfile | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const handleOpenCreate = () => {
    setEditUser(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (user: UserProfile) => {
    setEditUser(user)
    setFormOpen(true)
  }

  const handleToggleActive = async (user: UserProfile) => {
    if (user.id === currentUser?.id) {
      toastError(t.users.cannotEditSelf)
      return
    }

    if (user.is_active) {
      setConfirmUser(user)
      return
    }

    await doToggle(user, true)
  }

  const doToggle = async (user: UserProfile, isActive: boolean) => {
    setToggling(user.id)
    setConfirmUser(null)

    const { error } = await updateLocalUser({
      userId: user.id,
      is_active: isActive,
    })

    if (error) {
      toastError(t.common.error)
    } else {
      toastSuccess(isActive ? t.users.activateSuccess : t.users.deactivateSuccess)
      refetch()
    }

    setToggling(null)
  }

  return (
    <div className="flex flex-col min-h-full page-enter">
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <Breadcrumbs items={[{ label: t.users.title }]} />
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t.users.title}</h1>
          <Button onClick={handleOpenCreate}>+ {t.users.addUser}</Button>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-5xl">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner className="w-7 h-7 text-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-sm">{t.users.noUsers}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {[t.users.colName, t.users.colLogin, t.users.colRole, t.users.colStatus, t.users.colCreated, t.users.colActions].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users.map((user) => {
                  const isSelf = user.id === currentUser?.id

                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors ${user.is_active ? 'hover:bg-slate-50 dark:hover:bg-slate-700/30' : 'opacity-50'}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
                            {isSelf ? <p className="text-[10px] text-blue-500 font-medium">(вы)</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {user.login ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          color={
                            user.role === 'director'
                              ? 'purple'
                              : user.role === 'financier'
                                ? 'blue'
                                : user.role === 'designer'
                                  ? 'yellow'
                                  : 'gray'
                          }
                        >
                          {(t.roles as Record<string, string>)[user.role] ?? user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={user.is_active ? 'green' : 'red'}>
                          {user.is_active ? t.users.active : t.users.inactive}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            {t.common.edit}
                          </button>
                          {user.role === 'manager' || user.role === 'designer' ? (
                            <Link
                              to={`/users/${user.id}/kpi`}
                              className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                            >
                              KPI
                            </Link>
                          ) : null}
                          {!isSelf ? (
                            <button
                              onClick={() => handleToggleActive(user)}
                              disabled={toggling === user.id}
                              className={`text-xs hover:underline cursor-pointer disabled:opacity-50 ${
                                user.is_active
                                  ? 'text-red-500 dark:text-red-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {toggling === user.id ? '...' : user.is_active ? t.users.deactivate : t.users.activate}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={refetch}
        user={editUser}
      />

      <Modal
        open={Boolean(confirmUser)}
        onClose={() => setConfirmUser(null)}
        title={t.users.deactivateConfirm}
        className="max-w-sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">{t.users.deactivateText}</p>
          {confirmUser ? (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-bold">
                {confirmUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{confirmUser.name}</p>
                <p className="text-xs text-slate-400">{confirmUser.login}</p>
              </div>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmUser(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="danger"
              onClick={() => confirmUser && doToggle(confirmUser, false)}
            >
              {t.users.deactivate}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
