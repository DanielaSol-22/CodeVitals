import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { errorMessage } from './api'

function axiosError(status: number, data: unknown) {
  const e = new AxiosError('fallo', 'ERR_BAD_REQUEST', undefined, undefined, { status, data, statusText: '', headers: {}, config: {} as never })
  return e
}

describe('errorMessage', () => {
  it('muestra el motivo de un error 422 de validación sin el prefijo técnico', () => {
    const e = axiosError(422, { detail: [{ msg: 'Value error, Solo se permiten repositorios por https.' }] })
    expect(errorMessage(e)).toBe('Solo se permiten repositorios por https.')
  })
  it('usa el detalle de texto de otros errores', () => {
    expect(errorMessage(axiosError(401, { detail: 'API key inválida o ausente.' }))).toBe('API key inválida o ausente.')
  })
})
