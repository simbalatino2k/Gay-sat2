import { Project, SyntaxKind, CallExpression } from 'ts-morph';

const project = new Project();
project.addSourceFilesAtPaths(['src/db/store.ts', 'server.ts']);

const storeFile = project.getSourceFileOrThrow('src/db/store.ts');
const serverFile = project.getSourceFileOrThrow('server.ts');

const storeClass = storeFile.getClassOrThrow('DataStore');

// 1. Make all public methods in DataStore async (except constructor etc)
const methodsToAsyncify = new Set<string>();
for (const method of storeClass.getInstanceMethods()) {
    if (method.getScope() === 'public' && !method.isAsync() && method.getName() !== 'saveToDisk' && method.getName() !== 'hydrateFromPostgres') {
        method.setIsAsync(true);
        const returnTypeNode = method.getReturnTypeNode();
        if (returnTypeNode && !returnTypeNode.getText().startsWith('Promise<')) {
            method.setReturnType(`Promise<${returnTypeNode.getText()}>`);
        } else if (!returnTypeNode) {
            method.setReturnType('Promise<any>');
        }
        methodsToAsyncify.add(method.getName());
    }
}

// 2. Add await to calls in server.ts
// Collect them first to avoid modifying AST while iterating
const callsToAwait = [];

for (const callExpr of serverFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = callExpr.getExpression();
    if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
        const propAccess = expr.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
        const expressionText = propAccess.getExpression().getText();
        const nameText = propAccess.getName();

        if (expressionText === 'store' && methodsToAsyncify.has(nameText)) {
            const parent = callExpr.getParent();
            if (parent && parent.getKind() !== SyntaxKind.AwaitExpression) {
                // Find enclosing function
                let func = null;
                let current = callExpr.getParent();
                while (current) {
                    if (current.getKind() === SyntaxKind.ArrowFunction || current.getKind() === SyntaxKind.FunctionDeclaration || current.getKind() === SyntaxKind.FunctionExpression) {
                        func = current.asKind(SyntaxKind.ArrowFunction) || current.asKind(SyntaxKind.FunctionDeclaration) || current.asKind(SyntaxKind.FunctionExpression);
                        break;
                    }
                    current = current.getParent();
                }
                callsToAwait.push({ callExpr, func });
            }
        }
    }
}

// Reverse sort by position to not mess up indices during replacement
callsToAwait.sort((a, b) => b.callExpr.getPos() - a.callExpr.getPos());

for (const { callExpr, func } of callsToAwait) {
    if (func && !func.isAsync()) {
        func.setIsAsync(true);
    }
    callExpr.replaceWithText(`await ${callExpr.getText()}`);
}

project.saveSync();
console.log('Refactoring complete.');
