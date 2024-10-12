import ts from 'typescript';
import type { PrismaEntity } from '../helpers/dmmf';
import type { PrismaJsonTypesGeneratorConfig } from '../util/config';
import type { DeclarationWriter } from '../util/declaration-writer';
import { handleModelPayload } from './model-payload';
import { replaceObject } from './replace-object';

export function handleStatement(
  statement: ts.Statement,
  writer: DeclarationWriter,
  models: PrismaEntity[],
  config: PrismaJsonTypesGeneratorConfig
) {
  if (statement.kind !== ts.SyntaxKind.TypeAliasDeclaration) {
    return;
  }

  const type = statement as ts.TypeAliasDeclaration;

  if (type.type.kind !== ts.SyntaxKind.TypeLiteral) {
    return;
  }

  const name = type.name.getText();

  for (const model of models) {
    if (name === `$${model.name}Payload`) {
      return handleModelPayload(type, writer, model, config);
    }

    // Add handling for input types
    if (name.endsWith('CreateInput') || name.endsWith('UpdateInput')) {
      return replaceObject(type.type as ts.TypeLiteralNode, writer, model, config, true);
    }

    for (const regexp of model.regexps) {
      if (regexp.test(name)) {
        return replaceObject(type.type as ts.TypeLiteralNode, writer, model, config);
      }
    }
  }
}
