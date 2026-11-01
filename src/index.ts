import Resolver from '@forge/resolver';
import { getText } from './resolvers/getText';

const resolver = new Resolver();

resolver.define('getText', getText);

export const handler = resolver.getDefinitions();
