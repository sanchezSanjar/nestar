import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import { Types } from "mongoose";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {

    private readonly logger: Logger = new Logger();

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const recordTime = Date.now();
        const requestType = context.getType<GqlContextType>();
        
        if(requestType === "http") {
            //Develop if needed!
            return next.handle();

        } else if (requestType === 'graphql') {
            //(1) Print Request
            const gqlContext = GqlExecutionContext.create(context);
            this.logger.log(`${this.stringify(gqlContext.getContext().req.body)}`, 'REQUEST');
            
            // (2) Errors handling via GraphQL

            // (3) No Errors giving Response below

            return next.handle().pipe(
            tap((context) => { 
                const responseTime = Date.now() - recordTime;
                this.logger.log(`${this.stringify(context)} - ${responseTime}ms \n\n`, "RESPONSE");
            }),
         );
        }

        return next.handle()
    }

        private stringify(context: any): string {
            return JSON.stringify(this.redact(context)).slice(0, 75);
        }

        private redact(value: any): any {
            if (typeof value === 'string')
                return value.replace(/(memberPassword\s*:\s*")(?:[^"\\]|\\.)*"/g, '$1***"');
            if (Array.isArray(value)) return value.map((ele) => this.redact(ele));
            if (value && typeof value === 'object' && !(value instanceof Date) && !Types.ObjectId.isValid(value)) {
                const result = {};
                for (const key of Object.keys(value?._doc ?? value)) {
                    result[key] = key === 'memberPassword' ? '***' : this.redact(value[key]);
                }
                return result;
            }
            return value;
        }
        
      
    }
