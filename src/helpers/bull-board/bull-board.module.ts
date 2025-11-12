/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { DynamicModule, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ExpressAdapter } from '@bull-board/express';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'transaction',
    }),
  ],
})
export class BullBoardModule {
  static forRoot(): DynamicModule {
    const BULL_BOARD_TOKEN = 'BULL_BOARD_ADAPTER';

    return {
      module: BullBoardModule,
      providers: [
        {
          provide: BULL_BOARD_TOKEN,
          useFactory: (): ExpressAdapter => {
            const adapter = new ExpressAdapter();
            adapter.setBasePath('/admin/queues');
            return adapter;
          },
        },
      ],
      exports: [BULL_BOARD_TOKEN],
    };
  }
}
