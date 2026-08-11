"""Workflow routes — CRUD + execution."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.domain_services import WorkflowService

router = APIRouter()


async def get_workflow_service(session: AsyncSession = Depends(get_db)) -> WorkflowService:
    return WorkflowService(session)


@router.get("", summary="List workflows")
async def list_workflows(service: WorkflowService = Depends(get_workflow_service)) -> list[dict]:
    return await service.list_workflows()


@router.get("/{workflow_id}", summary="Get workflow details")
async def get_workflow(
    workflow_id: str, service: WorkflowService = Depends(get_workflow_service)
) -> dict:
    result = await service.get_workflow(workflow_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found.")
    return result


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a workflow")
async def create_workflow(
    data: dict, service: WorkflowService = Depends(get_workflow_service)
) -> dict:
    return await service.create_workflow(data)


@router.put("/{workflow_id}", summary="Update a workflow")
async def update_workflow(
    workflow_id: str, data: dict, service: WorkflowService = Depends(get_workflow_service)
) -> dict:
    result = await service.update_workflow(workflow_id, data)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found.")
    return result


@router.delete(
    "/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a workflow"
)
async def delete_workflow(
    workflow_id: str, service: WorkflowService = Depends(get_workflow_service)
) -> None:
    success = await service.delete_workflow(workflow_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found.")


@router.post("/{workflow_id}/execute", summary="Execute a workflow")
async def execute_workflow(
    workflow_id: str, service: WorkflowService = Depends(get_workflow_service)
) -> dict:
    return await service.execute_workflow(workflow_id)
