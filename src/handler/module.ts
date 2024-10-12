import ts from 'typescript';
import type { PrismaEntity } from '../helpers/dmmf';
import type { PrismaJsonTypesGeneratorConfig } from '../util/config';
import { PRISMA_NAMESPACE_NAME } from '../util/constants';
import type { DeclarationWriter } from '../util/declaration-writer';
import { PrismaJsonTypesGeneratorError } from '../util/error';
import { handleStatement } from './statement';

/** Handles the prisma namespace module recursively. */
export function handlePrismaModule(
  child: ts.ModuleDeclaration,
  writer: DeclarationWriter,
  models: PrismaEntity[],
  config: PrismaJsonTypesGeneratorConfig
) {
  const name = child.name && (child.name as ts.Identifier).text;

  // Not a Prisma namespace
  if (!name || ![PRISMA_NAMESPACE_NAME, 'Prisma'].includes(name)) {
    return;
  }

  const content = child.body as ts.ModuleBlock | ts.NamespaceDeclaration;

  if (!content) {
    throw new PrismaJsonTypesGeneratorError('Prisma namespace content could not be found');
  }

  if (content.kind === ts.SyntaxKind.ModuleBlock) {
    for (const statement of content.statements) {
      try {
        if (statement.kind === ts.SyntaxKind.ModuleDeclaration) {
          handlePrismaModule(statement as ts.ModuleDeclaration, writer, models, config);
        } else {
          handleStatement(statement, writer, models, config);
        }
      } catch (error) {
        // This allows some types to be generated even if others may fail
        // which is good for incremental development/testing
        if (error instanceof PrismaJsonTypesGeneratorError) {
          return PrismaJsonTypesGeneratorError.handler(error);
        }

        // Stops this generator is error thrown is not manually added by our code.
        throw error;
      }
    }
  } else if (content.kind === ts.SyntaxKind.ModuleDeclaration) {
    handlePrismaModule(content as ts.ModuleDeclaration, writer, models, config);
  }
}
