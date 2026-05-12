import { useState } from 'react'
import { createLocalUser, updateLocalUser } from '../lib/localDb'
import { Modal } from './Modal'
import { Input } from './Input'
import { Select } from './Select'
import { Button } from './Button'
import { toastSuccess, toastError } from '../lib/toast'
import { useT } from '../i18n'
import type { UserProfile } from '../hooks/useUsers'
import type { UserRole } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  user?: UserProfile | null
}

interface FormProps {
  onClose: () => void
  onSuccess: () => void
  user: UserProfile | null
}

function UserFormBody({ onClose, onSuccess, user }: FormProps) {
  const t = useT()
  const isEdit = Boolean(user)

  const roleOptions = [
    { value: 'manager', label: t.roles.manager },
    { value: 'designer', label: t.roles.designer },
    { value: 'financier', label: t.roles.financier },
    { value: 'director', label: t.roles.director },
  ]

  const [name, setName] = useState(user?.name ?? '')
  const [login, setLogin] = useState(user?.login ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<UserRole>(user?.role ?? 'manager')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = () => {
    if (!name.trim()) return t.common.required
    if (!isEdit && !login.trim()) return t.common.required
    if (!isEdit && !password) return t.common.required
    if (password && password.length < 6) return t.users.passwordTooShort
    if (password && password !== confirm) return t.users.passwordMismatch
    return null
  }

  const handleSave = async () => {
    const nextError = validate()
    if (nextError) {
      setError(nextError)
      return
    }

    setSaving(true)
    setError(null)

    if (isEdit && user) {
      const { error: updateError } = await updateLocalUser({
        userId: user.id,
        name: name.trim(),
        role,
        password: password || undefined,
      })

      if (updateError) {
        const message = updateError === 'password_too_short' ? t.users.passwordTooShort : t.users.createError
        setError(message)
        toastError(message)
        setSaving(false)
        return
      }

      toastSuccess(t.users.updateSuccess)
    } else {
      const { error: createError } = await createLocalUser({
        name: name.trim(),
        login: login.trim(),
        password,
        role,
      })

      if (createError) {
        const message = createError === 'login_exists'
          ? t.users.loginExists
          : createError === 'password_too_short'
            ? t.users.passwordTooShort
            : t.users.createError
        setError(message)
        toastError(message)
        setSaving(false)
        return
      }

      toastSuccess(t.users.createSuccess)
    }

    setSaving(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label={t.users.nameLabel}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.users.namePlaceholder}
        autoFocus
      />

      {!isEdit ? (
        <div>
          <Input
            label={t.users.loginLabel}
            value={login}
            onChange={(e) => setLogin(e.target.value.toLowerCase().replace(/\s/g, ''))}
            placeholder={t.users.loginPlaceholder}
          />
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.users.loginHint}</p>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
            {t.users.loginLabel}
          </label>
          <div className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 select-none">
            {user?.login ?? '-'}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.users.loginHint}</p>
        </div>
      )}

      <Select
        label={t.users.roleLabel}
        options={roleOptions}
        value={role}
        onChange={(e) => setRole(e.target.value as UserRole)}
      />

      <Input
        label={isEdit ? t.users.newPasswordLabel : t.users.passwordLabel}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="********"
      />

      {isEdit && (
        <p className="text-xs text-slate-400 dark:text-slate-500 -mt-2">{t.users.newPasswordHint}</p>
      )}

      {(!isEdit || password) && (
        <Input
          label={t.users.confirmLabel}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t.users.confirmPlaceholder}
        />
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose}>{t.common.cancel}</Button>
        <Button onClick={handleSave} loading={saving}>{t.common.save}</Button>
      </div>
    </div>
  )
}

export function UserFormModal({ open, onClose, onSuccess, user }: Props) {
  const t = useT()
  const isEdit = Boolean(user)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t.users.editTitle : t.users.createTitle}
      className="max-w-md"
    >
      {open ? (
        <UserFormBody
          key={user?.id ?? 'new-user'}
          onClose={onClose}
          onSuccess={onSuccess}
          user={user ?? null}
        />
      ) : null}
    </Modal>
  )
}
