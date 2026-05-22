import { Router } from 'express'
import { callLumen } from '../lumenClient.js'
import { validateQuery, pathOnlyQuery, folderCreateBody } from '../middleware/validateQuery.js'

const r = Router()

r.get('/folder', validateQuery(pathOnlyQuery), async (req, res, next) => {
  try {
    const { path } = req.query
    const { data } = await callLumen({
      method: 'GET',
      url: `/folder/${encodeURIComponent(path)}`,
    })
    res.json(data)
  } catch (e) {
    next(e)
  }
})

r.post(
  '/folder/create',
  validateQuery(pathOnlyQuery),
  validateQuery(folderCreateBody, 'body'),
  async (req, res, next) => {
    try {
      const { path } = req.query
      const { data } = await callLumen({
        method: 'POST',
        url: `/folder/create/${encodeURIComponent(path)}`,
        data: req.body,
      })
      res.json(data)
    } catch (e) {
      next(e)
    }
  },
)

export default r
