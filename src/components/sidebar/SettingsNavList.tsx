// Sidebar scroll-area list shown while the app is on the Settings page.
// Holds the setting categories (通用 / 研究画布 / 任务 / 聊天) that used to be the
// settings page's leftmost column — selecting one drives the page (its items +
// detail) through the shared useSettingsNav store, and the matching category
// stays highlighted. A "设置" group header sits at the top so the surface stays
// labelled now that the page's own header is gone.
import { useT } from '../../lib/i18n/LocaleContext';
import { buildCategories, categoryIdForPane, NavIcon } from '../settings/settings-nav';
import { useSettingsNav } from '../../store/useSettingsNav';

export function SettingsNavList() {
  const { t } = useT();
  const activePane = useSettingsNav((s) => s.activePane);
  const setActivePane = useSettingsNav((s) => s.setActivePane);

  // Categories are auth-independent (only the items inside 通用 vary by sign-in),
  // so a fixed `buildCategories(false)` is enough for the sidebar's category rows.
  const categories = buildCategories(false);
  const activeCategory = categoryIdForPane(activePane);

  return (
    <div data-testid="sidebar-settings-list">
      <div className="nb-grp">{t('nav.settings')}</div>
      {categories.map((cat) => {
        const selected = activeCategory === cat.id;
        return (
          <div
            key={cat.id}
            className={`nb-item${selected ? ' active' : ''}`}
            onClick={() => setActivePane(cat.items[0].id)}
            data-testid={`settings-category-${cat.id}`}
          >
            <NavIcon icon={cat.icon} tint={cat.tint} />
            <div className="meta">
              <div className="title">{cat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
