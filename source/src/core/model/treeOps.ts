/**
 * Public facade for tree operations. The implementation is split into
 * treeCore (primitives), treeStructure (editing/navigation) and treeText
 * (search & replace). All historical imports from treeOps keep working.
 */
export * from './treeCore';
export * from './treeStructure';
export * from './treeText';
