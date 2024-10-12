import type { GeneratorOptions } from '@prisma/generator-helper';
import ts from 'typescript';
import { handlePrismaModule } from './handler/module';
import { extractPrismaModels } from './helpers/dmmf';
import { parseConfig } from './util/config';
import { DeclarationWriter } from './util/declaration-writer';
import { findPrismaClientGenerator } from './util/prisma-generator';
import { buildTypesFilePath } from './util/source-path';
import { handleStatement } from './handler/statement';
import { PrismaJsonTypesGeneratorError } from './util/error';

/** Runs the generator with the given options. */
export async function onGenerate(options: GeneratorOptions) {
  try {
    const prismaClient = findPrismaClientGenerator(options.otherGenerators);

    const config = parseConfig(options.generator.config);

    const clientOutput = buildTypesFilePath(
      prismaClient.output.value,
      config.clientOutput,
      options.schemaPath
    );

    const writer = new DeclarationWriter(clientOutput, config);

    // Reads the prisma declaration file content.
    await writer.load();

    const tsSource = ts.createSourceFile(
      writer.filepath,
      writer.content,
      ts.ScriptTarget.ESNext,
      true,
      ts.ScriptKind.TS
    );

    const prismaModels = extractPrismaModels(options.dmmf);

    // Recursively handles the Prisma namespace.
    function processNode(node: ts.Node) {
      if (ts.isModuleDeclaration(node)) {
        handlePrismaModule(node, writer, prismaModels, config);
      } else if (ts.isStatement(node)) {
        try {
          handleStatement(node, writer, prismaModels, config);
        } catch (error) {
          if (error instanceof PrismaJsonTypesGeneratorError) {
            PrismaJsonTypesGeneratorError.handler(error);
          } else {
            throw error;
          }
        }
      }
      ts.forEachChild(node, processNode);
    }

    processNode(tsSource);

    await writer.save();
  } catch (error) {
    console.error(error);
  }
}
