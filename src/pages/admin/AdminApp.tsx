// ============================================================
// حزمة لوحة التحكم — تُحمَّل عند الطلب فقط (Code Splitting)
// ============================================================

import { Route, Routes } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import RequireAuth from '@/layouts/RequireAuth';
import LoginPage from '@/pages/admin/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import AdminArticlesPage from '@/pages/admin/AdminArticlesPage';
import ArticleEditorPage from '@/pages/admin/ArticleEditorPage';
import ReviewQueuePage from '@/pages/admin/ReviewQueuePage';
import AgentPage from '@/pages/admin/AgentPage';
import SourcesPage from '@/pages/admin/SourcesPage';
import CommentsPage from '@/pages/admin/CommentsPage';
import SettingsPage from '@/pages/admin/SettingsPage';

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="articles" element={<AdminArticlesPage />} />
        <Route path="articles/new" element={<ArticleEditorPage />} />
        <Route path="articles/:id/edit" element={<ArticleEditorPage />} />
        <Route path="review" element={<ReviewQueuePage />} />
        <Route path="agent" element={<AgentPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="comments" element={<CommentsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
