import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";

const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL ?? "";

// When Dev 2's subgraph URL is set in .env.local, all GraphQL queries will
// automatically route to it. Until then, the client is inert (queries error
// gracefully and hooks fall back to on-chain reads).
const link: ApolloLink = subgraphUrl
  ? new HttpLink({ uri: subgraphUrl })
  : new ApolloLink((operation, forward) => forward(operation));

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      Project: { keyFields: ["id"] },
      Milestone: { keyFields: ["id"] },
      Activity: { keyFields: ["id"] },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
    query: { fetchPolicy: "network-only", errorPolicy: "all" },
  },
});

export const isSubgraphConfigured = Boolean(subgraphUrl);
