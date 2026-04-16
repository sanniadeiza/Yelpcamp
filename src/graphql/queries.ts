// tslint:disable
// this is an auto generated file. This will be overwritten

export const getRestaurant = `query GetRestaurant($id: ID!) {
  getRestaurant(id: $id) {
    id
    name
    description
    city
  }
}
`;
export const listRestaurants = `query ListRestaurants(
  $filter: ModelRestaurantFilterInput
  $limit: Int
  $nextToken: String
) {
  listRestaurants(filter: $filter, limit: $limit, nextToken: $nextToken) {
    items {
      id
      name
      description
      city
    }
    nextToken
  }
}
`;
export const reviewsByRestaurantID = `query ReviewsByRestaurantID(
  $restaurantID: ID!
  $sortDirection: ModelSortDirection
  $filter: ModelReviewFilterInput
  $limit: Int
  $nextToken: String
) {
  reviewsByRestaurantID(
    restaurantID: $restaurantID
    sortDirection: $sortDirection
    filter: $filter
    limit: $limit
    nextToken: $nextToken
  ) {
    items {
      id
      restaurantID
      rating
      content
      author
      createdAt
      updatedAt
    }
    nextToken
  }
}
`;
