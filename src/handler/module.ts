import ts from 'typescript';
import type { PrismaEntity } from '../helpers/dmmf';
import type { PrismaJsonTypesGeneratorConfig } from '../util/config';
import { PRISMA_NAMESPACE_NAME } from '../util/constants';
import type { DeclarationWriter } from '../util/declaration-writer';
import { PrismaJsonTypesGeneratorError } from '../util/error';
import { handleStatement } from './statement';

/** Handles the prisma namespace module recursively. */
export function handlePrismaModule(
  node: ts.ModuleDeclaration,
  writer: DeclarationWriter,
  models: PrismaEntity[],
  config: PrismaJsonTypesGeneratorConfig
) {
  const name = node.name && (node.name as ts.Identifier).text;

  // Not a Prisma namespace
  if (!name || name !== PRISMA_NAMESPACE_NAME) {
    return;
  }

  let body = node.body;

  if (!body) {
    throw new PrismaJsonTypesGeneratorError('Prisma namespace content could not be found');
  }

  // Recursively process the module body
  if (ts.isModuleBlock(body)) {
    for (const statement of body.statements) {
      if (ts.isModuleDeclaration(statement)) {
        handlePrismaModule(statement, writer, models, config);
      } else {
        try {
          handleStatement(statement, writer, models, config);
        } catch (error) {
          if (error instanceof PrismaJsonTypesGeneratorError) {
            PrismaJsonTypesGeneratorError.handler(error);
          } else {
            throw error;
          }
        }
      }
    }
  } else if (ts.isModuleDeclaration(body)) {
    handlePrismaModule(body, writer, models, config);
  }
}
