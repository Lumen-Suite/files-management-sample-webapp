import { Router } from 'express'
import { callLumen } from '../lumenClient.js'
import {
  validateQuery,
  pathOnlyQuery,
  uploadBody,
  batchUploadBody,
  metadataPatchBody,
  restoreBody,
} from '../middleware/validateQuery.js'

const r = Router()

r.get('/file', validateQuery(pathOnlyQuery), async (req, res, next) => {
  try {
    const { path } = req.query
    const { data } = await callLumen({
      method: 'GET',
      url: `/file/${encodeURIComponent(path)}`,
    })
    res.json(data)
  } catch (e) {
    next(e)
  }
})

r.post(
  '/file/create',
  validateQuery(pathOnlyQuery),
  validateQuery(uploadBody, 'body'),
  async (req, res, next) => {
    try {
      const { path } = req.query
      const { data } = await callLumen({
        method: 'POST',
        url: `/file/create/${encodeURIComponent(path)}`,
        data: req.body,
      })
      res.json(data)
    } catch (e) {
      next(e)
    }
  },
)

r.post(
  '/files/create',
  validateQuery(pathOnlyQuery),
  validateQuery(batchUploadBody, 'body'),
  async (req, res, next) => {
    try {
      const { path } = req.query
      const { data } = await callLumen({
        method: 'POST',
        url: `/files/create/${encodeURIComponent(path)}`,
        data: req.body,
      })
      res.json(data)
    } catch (e) {
      next(e)
    }
  },
)

r.patch(
  '/file/metadata',
  validateQuery(pathOnlyQuery),
  validateQuery(metadataPatchBody, 'body'),
  async (req, res, next) => {
    try {
      const { path } = req.query
      const { data } = await callLumen({
        method: 'PATCH',
        url: `/file/metadata/${encodeURIComponent(path)}`,
        data: req.body,
      })
      res.json(data)
    } catch (e) {
      next(e)
    }
  },
)

r.delete('/file/archive', validateQuery(pathOnlyQuery), async (req, res, next) => {
  try {
    const { path } = req.query
    const { data } = await callLumen({
      method: 'DELETE',
      url: `/file/archive/${encodeURIComponent(path)}`,
    })
    res.json(data)
  } catch (e) {
    next(e)
  }
})

r.patch(
  '/file/restore',
  validateQuery(pathOnlyQuery),
  validateQuery(restoreBody, 'body'),
  async (req, res, next) => {
    try {
      const { path } = req.query
      const { data } = await callLumen({
        method: 'PATCH',
        url: `/file/restore/${encodeURIComponent(path)}`,
        data: req.body,
      })
      res.json(data)
    } catch (e) {
      next(e)
    }
  },
)

r.delete('/file/delete', validateQuery(pathOnlyQuery), async (req, res, next) => {
  try {
    const { path } = req.query
    const { data } = await callLumen({
      method: 'DELETE',
      url: `/file/delete/${encodeURIComponent(path)}`,
    })
    res.json(data)
  } catch (e) {
    next(e)
  }
})

export default r
