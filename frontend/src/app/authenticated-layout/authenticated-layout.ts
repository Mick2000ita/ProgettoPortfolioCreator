import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { TreeDragDropService, TreeNode } from 'primeng/api';
import { TreeModule } from 'primeng/tree';
import { filter } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';
import {
  DEFAULT_BACKGROUND_COLOR,
  EditorNodeData,
  PortfolioEditorStateService
} from '../services/portfolio-editor-state.service';

@Component({
  selector: 'app-authenticated-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TreeModule],
  providers: [TreeDragDropService],
  templateUrl: './authenticated-layout.html',
  styleUrl: './authenticated-layout.scss'
})
export class AuthenticatedLayout {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly portfolioEditorStateService = inject(PortfolioEditorStateService);

  protected readonly user = this.authSessionService.user;
  protected readonly currentUrl = signal(this.router.url);
  protected readonly isEditorRoute = computed(() =>
    /^\/portfolios\/[^/]+\/edit(?:[?#].*)?$/.test(this.currentUrl())
  );
  protected readonly editorTreeNodes = this.portfolioEditorStateService.treeNodes;
  protected readonly selectedEditorTreeNode = this.portfolioEditorStateService.selectedTreeNode;
  protected readonly editorNodeCount = this.portfolioEditorStateService.nodeCount;
  protected readonly editorBackgroundColor = computed(() => {
    const backgroundNode = this.editorTreeNodes().find((node) => node.data?.type === 'background');
    return backgroundNode?.data?.colorValue || DEFAULT_BACKGROUND_COLOR;
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

  protected onEditorSelectionChange(
    selection: TreeNode<EditorNodeData> | TreeNode<EditorNodeData>[] | null | undefined
  ) {
    this.portfolioEditorStateService.onSelectionChange(selection);
  }

  protected onEditorNodeDrop(event: { accept?: Function }) {
    this.portfolioEditorStateService.onNodeDrop(event);
  }

  protected logout() {
    this.authSessionService.clearSession();
    void this.router.navigate(['/']);
  }
}
