import { Expose, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

import { BaseMessageConstructor } from '../../agent/BaseMessage';
import { ThreadDecorator } from './ThreadDecorator';

export function ThreadDecorated<T extends BaseMessageConstructor>(Base: T) {
  class ThreadDecoratorExtension extends Base {
    /**
     * The ~thread decorator is generally required on any type of response, since this is what connects it with the original request.
     */
    @Expose({ name: '~thread' })
    @Type(() => ThreadDecorator)
    @ValidateNested()
    thread?: ThreadDecorator;

    getThreadId(): string | undefined {
      return this.thread?.threadId || this.id;
    }

    setThread(options: Partial<ThreadDecorator>) {
      this.thread = new ThreadDecorator(options);
    }
  }

  return ThreadDecoratorExtension;
}
