
import strawberry
from typing import List

@strawberry.type
class ProjectionData:
    pca_2d: List[List[float]]
    pca_3d: List[List[float]]
    umap_2d: List[List[float]]
    umap_3d: List[List[float]]

@strawberry.type
class Query:
    @strawberry.field
    def data(self) -> ProjectionData:
        return ProjectionData(
            pca_2d=[[1.0, 2.0]],
            pca_3d=[[1.0, 2.0, 3.0]],
            umap_2d=[[1.0, 2.0]],
            umap_3d=[[1.0, 2.0, 3.0]]
        )

schema = strawberry.Schema(query=Query)
print(schema.get_type_by_name("ProjectionData").fields)
