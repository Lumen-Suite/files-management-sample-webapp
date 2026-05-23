import { Router } from 'express'
import { callLumen, encodePath } from '../lumenClient.js'
import { validateQuery, listQuery } from '../middleware/validateQuery.js'

const r = Router()

r.get('/directoryItems', validateQuery(listQuery), async (req, res, next) => {
  try {
    const { path, ...rest } = req.query
    const { data } = await callLumen({
      method: 'GET',
      url: `/directoryItems/${encodePath(path)}`,
      params: rest,
    })
    res.json(data)
  } catch (e) {
    next(e)
  }
})

r.get('/directoryItems/logs', validateQuery(listQuery), async (req, res, next) => {
  try {
    const { path, ...rest } = req.query
    const { data } = await callLumen({
      method: 'GET',
      url: `/directoryItems/logs/${encodePath(path)}`,
      params: rest,
    })
    res.json(data)
  } catch (e) {
    next(e)
  }
})

r.get('/archivedFiles', validateQuery(listQuery), async (req, res, next) => {
  try {
    const { path, ...rest } = req.query
    const { data } = await callLumen({
      method: 'GET',
      url: `/archivedFiles/${encodePath(path)}`,
      params: rest,
    })
    res.json(data)
  } catch (e) {
    next(e)
  }
})

export default r
