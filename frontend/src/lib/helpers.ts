// CSV parsing helpers
export const parseCSV = (s?: string): string[] => {
  if (!s) return [];
  return s.split(',').map(x => x.trim()).filter(Boolean);
};

export const parseSponsors = (s?: string): Array<{ logo: string; name: string }> => {
  return parseCSV(s).map(row => {
    const [logo, name] = row.split('|');
    return { logo: logo?.trim() || '', name: name?.trim() || 'Unknown' };
  });
};

// Date helpers
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export const formatCurrency = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${numAmount.toFixed(0)}`;
};

// Deadline helpers
export const getDaysUntilDeadline = (deadline: string): number => {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getDeadlineStatus = (deadline: string): 'future' | 'soon' | 'past' => {
  const days = getDaysUntilDeadline(deadline);
  if (days < 0) return 'past';
  if (days <= 7) return 'soon';
  return 'future';
};

export const getDeadlineColor = (deadline: string): string => {
  const status = getDeadlineStatus(deadline);
  switch (status) {
    case 'future': return 'text-green-600';
    case 'soon': return 'text-yellow-600';
    case 'past': return 'text-red-600';
    default: return 'text-gray-600';
  }
};
