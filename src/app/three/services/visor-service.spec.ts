import { TestBed } from '@angular/core/testing';

import { VisorService } from './visor-service';

describe('VisorService', () => {
  let service: VisorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VisorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
