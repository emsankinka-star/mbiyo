'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { FiMessageSquare, FiCheck, FiClock, FiAlertCircle, FiChevronRight } from 'react-icons/fi';

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('open');
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/support-tickets', { params: { status: filter } });
      setTickets(data.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  const handleReply = async () => {
    if (!reply.trim() || !selected) return;
    try {
      await api.post(`/support/${selected.id}/messages`, { message: reply });
      toast.success('Réponse envoyée');
      setReply('');
      // Refresh
      const { data } = await api.get(`/support/${selected.id}`);
      setSelected(data.data);
    } catch { toast.error('Erreur'); }
  };

  const handleClose = async (ticketId) => {
    try {
      await api.put(`/admin/support-tickets/${ticketId}`, { status: 'closed' });
      toast.success('Ticket fermé');
      fetchTickets();
      setSelected(null);
    } catch { toast.error('Erreur'); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-sm text-gray-400">Gestion des tickets de support</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['open', 'in_progress', 'closed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === f ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 border'}`}>
            {f === 'open' ? 'Ouverts' : f === 'in_progress' ? 'En cours' : 'Fermés'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets list */}
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <FiMessageSquare size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400">Aucun ticket</p>
            </div>
          ) : tickets.map((ticket) => (
            <button key={ticket.id} onClick={() => setSelected(ticket)}
              className={`w-full bg-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-shadow ${selected?.id === ticket.id ? 'ring-2 ring-primary-500' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{ticket.subject}</span>
                <FiChevronRight size={16} className="text-gray-300" />
              </div>
              <p className="text-xs text-gray-400">{ticket.user_name || 'Utilisateur'} · {new Date(ticket.created_at).toLocaleDateString('fr-FR')}</p>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ticket.message}</p>
            </button>
          ))}
        </div>

        {/* Selected ticket detail */}
        {selected && (
          <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{selected.subject}</h3>
              {selected.status !== 'closed' && (
                <button onClick={() => handleClose(selected.id)} className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-medium">
                  Fermer le ticket
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">{selected.user_name} · {new Date(selected.created_at).toLocaleString('fr-FR')}</p>
                <p className="text-sm">{selected.message}</p>
              </div>
              {(selected.messages || []).map((msg, i) => (
                <div key={i} className={`rounded-xl p-3 ${msg.is_admin ? 'bg-primary-50 ml-4' : 'bg-gray-50 mr-4'}`}>
                  <p className="text-xs text-gray-400 mb-1">{msg.is_admin ? 'Admin' : selected.user_name} · {new Date(msg.created_at).toLocaleString('fr-FR')}</p>
                  <p className="text-sm">{msg.message}</p>
                </div>
              ))}
            </div>
            {selected.status !== 'closed' && (
              <div className="flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Votre réponse..."
                  className="flex-1 border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleReply()} />
                <button onClick={handleReply} className="bg-primary-600 text-white px-4 rounded-xl text-sm font-medium hover:bg-primary-700">
                  Envoyer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
