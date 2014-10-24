import {Compiler as TraceurCompiler} from 'traceur/src/Compiler';
import {DartTransformer} from './codegeneration/DartTransformer';
import {ES5Transformer} from './codegeneration/ES5Transformer';
import {DartParseTreeWriter} from './outputgeneration/DartParseTreeWriter';
import {ES5ParseTreeWriter} from './outputgeneration/ES5ParseTreeWriter';
import {CollectingErrorReporter} from 'traceur/src/util/CollectingErrorReporter';
import {Parser} from './parser';
import {SourceFile} from 'traceur/src/syntax/SourceFile';
import {
  options as traceurOptions
} from 'traceur/src/Options';

export class Compiler extends TraceurCompiler {

  constructor(options, sourceRoot) {
    super(options, sourceRoot);
  }

  transform(tree, moduleName = undefined) {
    if (this.options_.outputLanguage.toLowerCase() === 'dart') {
      var errorReporter = new CollectingErrorReporter();
      var transformer = new DartTransformer(errorReporter);
      var transformedTree = transformer.transform(tree);
      this.throwIfErrors(errorReporter);
      return transformedTree;
    } else if (this.options_.outputLanguage.toLowerCase() === 'es5') {
      var errorReporter = new CollectingErrorReporter();
      var transformer = new ES5Transformer(errorReporter);
      // runs before the default transform behavior takes place, as it preserves
      // more information about types
      var transformedTree = transformer.transform(tree);
      this.throwIfErrors(errorReporter);
      // runs the default transformation too
      return super(transformedTree, moduleName);
    } else {
      return super(tree, moduleName);
    }
  }

  write(tree, outputName = undefined, sourceRoot = undefined) {
    if (this.options_.outputLanguage.toLowerCase() === 'dart') {
      var writer = new DartParseTreeWriter(this.options_.moduleName, outputName);
      writer.visitAny(tree);
      return writer.toString();
    } else if (this.options_.outputLanguage.toLowerCase() === 'es5') {
      var writer = new ES5ParseTreeWriter(this.options_.moduleName, outputName);
      writer.visitAny(tree);
      return writer.toString();
    } else {
      return super.write(tree, outputName, sourceRoot);
    }
  }

  // Copy of the original method to use our custom Parser
  parse(content, sourceName) {
    if (!content) {
      throw new Error('Compiler: no content to compile.');
    } else if (!sourceName) {
      throw new Error('Compiler: no source name for content.');
    }

    this.sourceMapGenerator_ = null;
    // Here we mutate the global/module options object to be used in parsing.
    traceurOptions.setFromObject(this.options_);

    var errorReporter = new CollectingErrorReporter();
    sourceName = this.sourceName(sourceName);
    var sourceFile = new SourceFile(sourceName, content);
    var parser = new Parser(sourceFile, errorReporter);
    var tree =
        this.options_.script ? parser.parseScript() : parser.parseModule();
    this.throwIfErrors(errorReporter);
    return tree;
  }
}
