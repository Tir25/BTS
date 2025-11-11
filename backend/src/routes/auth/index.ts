import express from 'express';
import driverRouter from './driver';
import studentRouter from './student';

const router = express.Router();

router.use('/', driverRouter);
router.use('/', studentRouter);

export default router;


