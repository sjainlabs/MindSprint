import { TestBed } from '@angular/core/testing';

import { PracticeTopicCatalogService } from './practice-topic-catalog.service';

describe('PracticeTopicCatalogService', () => {
  let service: PracticeTopicCatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PracticeTopicCatalogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
