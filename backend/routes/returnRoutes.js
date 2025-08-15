import express from 'express'
import { 
  createReturn, 
  getAllReturns, 
  getReturnById, 
  updateReturn, 
  deleteReturn 
} from '../controller/returnController.js'

const router = express.Router()

// Create a new return
router.post('/', createReturn)

// Get all returns
router.get('/', getAllReturns)

// Get return by ID
router.get('/:id', getReturnById)

// Update return
router.put('/:id', updateReturn)

// Delete return
router.delete('/:id', deleteReturn)

export default router
