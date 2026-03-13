import { useEffect, useState, useMemo, useCallback } from 'react';
import { Input, Radio, Empty, Tag, Tooltip, Tree, Spin, message } from 'antd';
import {
  DesktopOutlined,
  CodeOutlined,
  FolderOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  StarOutlined,
  StarFilled,
  ClockCircleOutlined,
  EditOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { getHostList, updateHost, type Host } from '@/api/host';
import { getHostGroupList, getGroupHosts, type HostGroup } from '@/api/hostGroup';
import { useTerminalStore } from '../store';
import { getLatestHostIds, getFavoriteHostIds, toggleFavoriteHost, savePreferences, loadPreferences } from '../preferences';
import type { NewConnectionType } from '../types';

const NewConnectionView: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [groups, setGroups] = useState<HostGroup[]>([]);
  const [groupHostMap, setGroupHostMap] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<NewConnectionType>(() => loadPreferences().newConnectionType);
  const [filterValue, setFilterValue] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => getFavoriteHostIds());
  const { openSshSession, openSftpSession } = useTerminalStore();

  // Load host list
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getHostList({ pageSize: 1000, status: 1 }),
      getHostGroupList(),
    ])
      .then(([hostRes, groupRes]) => {
        setHosts(hostRes.rows || []);
        setGroups(groupRes || []);

        if (groupRes?.length) {
          const promises = groupRes.map((g: HostGroup) =>
            getGroupHosts(g.id).then((hostIds) => ({ groupId: g.id, hostIds: hostIds || [] }))
              .catch(() => ({ groupId: g.id, hostIds: [] as number[] }))
          );
          Promise.all(promises).then((results) => {
            const map: Record<number, number[]> = {};
            results.forEach((r) => {
              map[r.groupId] = r.hostIds;
            });
            setGroupHostMap(map);
          });
        }
      })
      .catch((e) => console.warn('加载主机列表失败', e))
      .finally(() => setLoading(false));
  }, []);

  // Filter hosts
  const filteredHosts = useMemo(() => {
    let list = hosts;

    // Apply view type filter
    if (viewType === 'group' && selectedGroupId !== null) {
      const hostIds = groupHostMap[selectedGroupId] || [];
      list = list.filter((h) => hostIds.includes(h.id));
    } else if (viewType === 'favorite') {
      list = list.filter((h) => favoriteIds.includes(h.id));
    } else if (viewType === 'latest') {
      const latestIds = getLatestHostIds();
      // Keep order of latestIds
      list = latestIds
        .map((id) => hosts.find((h) => h.id === id))
        .filter((h): h is Host => !!h);
    }

    // Apply text filter
    if (filterValue) {
      const search = filterValue.toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.address.toLowerCase().includes(search) ||
          h.code?.toLowerCase().includes(search) ||
          h.tags?.toLowerCase().includes(search)
      );
    }

    return list;
  }, [hosts, filterValue, viewType, selectedGroupId, groupHostMap, favoriteIds]);

  // Build tree data for groups
  const treeData = useMemo(() => {
    const buildTree = (parentId: number): any[] => {
      return groups
        .filter((g) => g.parentId === parentId)
        .sort((a, b) => a.sort - b.sort)
        .map((g) => ({
          key: g.id,
          title: `${g.name} (${(groupHostMap[g.id] || []).length})`,
          children: buildTree(g.id),
        }));
    };
    return buildTree(0);
  }, [groups, groupHostMap]);

  const getDisplayName = (host: Host) => host.alias || host.name;

  const handleOpenSsh = useCallback((host: Host) => {
    openSshSession(host.id, getDisplayName(host), `${host.address}:${host.port}`);
  }, [openSshSession]);

  const handleOpenSftp = useCallback((host: Host) => {
    openSftpSession(host.id, getDisplayName(host), `${host.address}:${host.port}`);
  }, [openSftpSession]);

  const handleUpdateAlias = useCallback(async (hostId: number, alias: string) => {
    try {
      await updateHost(hostId, { alias });
      setHosts((prev) => prev.map((h) => (h.id === hostId ? { ...h, alias } : h)));
      message.success('别名已更新');
    } catch {
      message.error('更新别名失败');
    }
  }, []);

  const handleToggleFavorite = useCallback((hostId: number) => {
    const nowFav = toggleFavoriteHost(hostId);
    setFavoriteIds(getFavoriteHostIds());
    message.success(nowFav ? '已收藏' : '已取消收藏');
  }, []);

  const handleViewTypeChange = (type: NewConnectionType) => {
    setViewType(type);
    setSelectedGroupId(null);
    savePreferences({ newConnectionType: type });
  };

  return (
    <div className="new-connection-container">
      <div className="new-connection-wrapper">
        <h2 className="new-connection-title">新建连接</h2>

        {/* Actions bar */}
        <div className="new-connection-actions">
          <Radio.Group
            value={viewType}
            onChange={(e) => handleViewTypeChange(e.target.value)}
            optionType="button"
            size="small"
          >
            <Radio.Button value="group">
              <AppstoreOutlined /> 分组
            </Radio.Button>
            <Radio.Button value="list">
              <UnorderedListOutlined /> 列表
            </Radio.Button>
            <Radio.Button value="favorite">
              <StarOutlined /> 收藏
            </Radio.Button>
            <Radio.Button value="latest">
              <ClockCircleOutlined /> 最近
            </Radio.Button>
          </Radio.Group>
          <Input.Search
            style={{ width: '36%' }}
            placeholder="搜索主机名称/地址/编码"
            allowClear
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        </div>

        {/* Subtitle */}
        <h3 className="new-connection-subtitle">
          {viewType === 'favorite' ? '收藏主机' : viewType === 'latest' ? '最近连接' : '授权主机'}
        </h3>

        {/* Content */}
        <Spin spinning={loading}>
          {viewType === 'group' ? (
            <div className="host-group-tree">
              <div className="host-group-tree-sidebar">
                <Tree
                  treeData={treeData}
                  defaultExpandAll
                  selectedKeys={selectedGroupId !== null ? [selectedGroupId] : []}
                  onSelect={(keys) => {
                    setSelectedGroupId(keys.length > 0 ? (keys[0] as number) : null);
                  }}
                />
              </div>
              <div className="host-group-tree-content">
                <HostList
                  hosts={filteredHosts}
                  favoriteIds={favoriteIds}
                  onOpenSsh={handleOpenSsh}
                  onOpenSftp={handleOpenSftp}
                  onToggleFavorite={handleToggleFavorite}
                  onUpdateAlias={handleUpdateAlias}
                />
              </div>
            </div>
          ) : (
            <HostList
              hosts={filteredHosts}
              favoriteIds={favoriteIds}
              onOpenSsh={handleOpenSsh}
              onOpenSftp={handleOpenSftp}
              onToggleFavorite={handleToggleFavorite}
              onUpdateAlias={handleUpdateAlias}
            />
          )}
        </Spin>
      </div>
    </div>
  );
};

// ============ Host List Component ============
interface HostListProps {
  hosts: Host[];
  favoriteIds: number[];
  onOpenSsh: (host: Host) => void;
  onOpenSftp: (host: Host) => void;
  onToggleFavorite: (hostId: number) => void;
  onUpdateAlias: (hostId: number, alias: string) => void;
}

const HostList: React.FC<HostListProps> = ({ hosts, favoriteIds, onOpenSsh, onOpenSftp, onToggleFavorite, onUpdateAlias }) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (host: Host) => {
    setEditingId(host.id);
    setEditValue(host.alias || '');
  };

  const saveAlias = (hostId: number) => {
    onUpdateAlias(hostId, editValue.trim());
    setEditingId(null);
  };

  if (hosts.length === 0) {
    return (
      <div style={{ padding: '40px 0' }}>
        <Empty
          image={<DesktopOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description="暂无主机"
        />
      </div>
    );
  }

  return (
    <div className="host-list-container">
      {hosts.map((host) => {
        const isFav = favoriteIds.includes(host.id);
        const isEditing = editingId === host.id;
        const displayName = host.alias || host.name;
        return (
          <div key={host.id} className="host-list-item">
            {/* Left: icon + name (with inline alias edit) */}
            <div className="host-list-item-left">
              <div className="host-list-item-icon">
                <DesktopOutlined />
              </div>
              {isEditing ? (
                <Input
                  size="small"
                  value={editValue}
                  maxLength={32}
                  style={{ width: 160 }}
                  autoFocus
                  placeholder="输入别名"
                  onChange={(e) => setEditValue(e.target.value)}
                  onPressEnter={() => saveAlias(host.id)}
                  onBlur={() => saveAlias(host.id)}
                  suffix={
                    <CheckOutlined
                      style={{ color: '#52c41a', cursor: 'pointer' }}
                      onClick={() => saveAlias(host.id)}
                    />
                  }
                />
              ) : (
                <>
                  <Tooltip title={`${host.name} (${host.code || ''})`} placement="top">
                    <span className="host-list-item-name">
                      {displayName}
                    </span>
                  </Tooltip>
                  <Tooltip title="编辑别名" placement="top">
                    <EditOutlined
                      style={{ marginLeft: 4, fontSize: 12, color: '#bbb', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); startEdit(host); }}
                    />
                  </Tooltip>
                </>
              )}
            </div>

            {/* Center: address */}
            <div className="host-list-item-center">
              <Tooltip title={`${host.address}:${host.port}`} placement="top">
                <span className="host-list-item-address">
                  {host.address}:{host.port}
                </span>
              </Tooltip>
            </div>

            {/* Right: tags + actions */}
            <div className="host-list-item-right">
              <div className="host-list-item-tags">
                {host.tags &&
                  host.tags.split(',').filter(Boolean).map((tag) => (
                    <Tag key={tag} color="blue">
                      {tag}
                    </Tag>
                  ))}
              </div>
              <div className="host-list-item-actions">
                <Tooltip title="SSH 终端" placement="top">
                  <div className="terminal-sidebar-icon-wrapper">
                    <button
                      className="terminal-sidebar-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSsh(host);
                      }}
                    >
                      <CodeOutlined />
                    </button>
                  </div>
                </Tooltip>
                <Tooltip title="SFTP 文件" placement="top">
                  <div className="terminal-sidebar-icon-wrapper">
                    <button
                      className="terminal-sidebar-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSftp(host);
                      }}
                    >
                      <FolderOutlined />
                    </button>
                  </div>
                </Tooltip>
                <Tooltip title={isFav ? '取消收藏' : '收藏'} placement="top">
                  <div className="terminal-sidebar-icon-wrapper">
                    <button
                      className="terminal-sidebar-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(host.id);
                      }}
                    >
                      {isFav ? (
                        <StarFilled style={{ color: '#fadb14' }} />
                      ) : (
                        <StarOutlined />
                      )}
                    </button>
                  </div>
                </Tooltip>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NewConnectionView;
