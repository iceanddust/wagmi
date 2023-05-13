import { type PersistedClient } from '@tanstack/query-persist-client-core'

import { type PartializedState } from './config.js'
import { deserialize as deserialize_ } from './utils/deserialize.js'
import { serialize as serialize_ } from './utils/serialize.js'

// key-values for loose autocomplete and typing
export type StorageItemMap = {
  cache: PersistedClient
  recentConnectorId: string
  state: PartializedState
}

export type Storage<
  TItem extends StorageItemMap | Record<string, unknown> = StorageItemMap,
> = {
  getItem<
    TKey extends keyof TItem | (string & {}),
    TValue extends TKey extends keyof TItem ? TItem[TKey] : unknown,
    TDefaultValue extends TValue | null,
  >(
    key: TKey,
    defaultValue?: TDefaultValue,
  ): TDefaultValue extends null ? TValue | null : TValue
  setItem<
    TKey extends keyof TItem | (string & {}),
    TValue extends (TKey extends keyof TItem ? TItem[TKey] : unknown) | null,
  >(key: TKey, value: TValue): void
  removeItem(key: keyof TItem | (string & {})): void
}

type BaseStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function createStorage<TItem extends StorageItemMap = StorageItemMap>({
  deserialize = deserialize_,
  key: prefix = 'wagmi',
  serialize = serialize_,
  storage,
}: {
  deserialize?: <T>(value: string) => T
  key?: string
  serialize?: <T>(value: T) => string
  storage: BaseStorage
}): Storage<TItem> {
  return {
    ...storage,
    getItem(key, defaultValue) {
      const value = storage.getItem(`${prefix}.${key as string}`)
      try {
        if (value) return deserialize(value)
        return (defaultValue ?? null) as any
      } catch (error) {
        console.warn(error)
        return defaultValue ?? null
      }
    },
    setItem(key, value) {
      const storageKey = `${prefix}.${key as string}`
      if (value === null) {
        storage.removeItem(storageKey)
      } else {
        try {
          storage.setItem(storageKey, serialize(value))
        } catch (err) {
          console.error(err)
        }
      }
    },
    removeItem(key) {
      storage.removeItem(`${prefix}.${key as string}`)
    },
  }
}

export const noopStorage: BaseStorage = {
  getItem: (_key) => '',
  setItem: (_key, _value) => null,
  removeItem: (_key) => null,
}
