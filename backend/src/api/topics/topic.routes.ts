import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  readExplorationRecommendation,
  readPersonalizedPath,
  readTopicBrowser,
  readTopicTaxonomy,
  readTopicsByGrade,
} from './topic.controller';

export const topicRouter = Router();
const topicLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

topicRouter.get('/taxonomy', topicLimiter, readTopicTaxonomy);
topicRouter.get('/by-grade', topicLimiter, readTopicsByGrade);
topicRouter.get('/personalized-path', topicLimiter, readPersonalizedPath);
topicRouter.get('/browser', topicLimiter, readTopicBrowser);
topicRouter.get('/explore', topicLimiter, readExplorationRecommendation);
