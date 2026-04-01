export default function timer<This, Args extends any[], Return>(target: (this: This, ...args: Args) => Return, context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>) {
    const name = String(context.name);

    return function (this: This, ...args: Args): Return {
        const startTime = performance.now();

        let result = target.apply(this, args);

        // If result is a Promise, chain logging to it
        if (result instanceof Promise) {
            return result
                .then((resolved) => {
                    const endTime = performance.now();
                    console.log(`⏱️ ${name} took ${(endTime - startTime).toFixed(4)}ms`);
                    return resolved;
                })
                .catch((error) => {
                    const endTime = performance.now();
                    console.log(`⏱️ ${name} took ${(endTime - startTime).toFixed(4)}ms`);
                    throw error;
                }) as Return;
        }

        // For synchronous returns
        const endTime = performance.now();
        console.log(`⏱️ ${name} took ${(endTime - startTime).toFixed(4)}ms`);
        return result;
    };
}
