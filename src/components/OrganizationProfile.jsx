import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Make sure this path matches your project structure

const OrganizationProfile = () => {
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Define the async function inside the effect
    const fetchOrgProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // A. Get the current User ID
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          console.log("No user logged in");
          setLoading(false);
          return;
        }

        // B. Fetch Organization Member Data
        // uses .maybeSingle() to return null instead of error if not found
        const { data, error: fetchError } = await supabase
          .from('organization_members')
          .select(`
                organization_id,
                organizations:organization_id ( name )
            `)
          .eq('user_id', user.id)
          .maybeSingle(); 

        if (fetchError) throw fetchError;

        if (data) {
          console.log("Organization Found:", data.organization_id);
          setOrgData(data);
        } else {
          console.log("User is not part of any organization.");
        }

      } catch (err) {
        console.error("Error fetching profile:", err.message);
        setError(err.message);
      } finally {
        // C. Always stop loading, even if there is an error
        setLoading(false);
      }
    };

    // 2. Call the function
    fetchOrgProfile();

  }, []); // <--- Empty dependency array prevents infinite loops

  // --- RENDER SECTION ---

  if (loading) {
    return <div className="p-4">Loading Profile...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }


  // --- ADD THIS FUNCTION ---
  const handleCreateOrg = async () => {
    // 1. Ask for the name
    const orgName = window.prompt("Enter your Organization Name (e.g., 'Grace Chapel'):");
    if (!orgName) return; // Stop if they clicked Cancel

    try {
      setLoading(true);
      
      // Get current user again to be safe
      const { data: { user } } = await supabase.auth.getUser();

      // 2. Insert the new Organization
      // We select() back the data so we can get the new ID
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert([{ name: orgName }]) 
        .select()
        .single();

      if (createError) throw createError;

      // 3. Add YOU as a member of that new Organization
      // (Assuming your table is named 'organization_members')
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([
            { 
              organization_id: newOrg.id, 
              user_id: user.id,
              // role: 'admin' // Uncomment if you have a 'role' column
            }
        ]);

      if (memberError) throw memberError;

      // 4. Success! Update local state so the UI changes immediately
      console.log("Created Org:", newOrg);
      setOrgData({ organization_id: newOrg.id });
      alert(`Organization "${orgName}" created successfully!`);

    } catch (err) {
      console.error("Creation failed:", err.message);
      alert("Error creating organization: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 bg-gray-800 text-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Organization Profile</h2>
      
      {orgData ? (
        <div>
            <p className="text-gray-300 mb-2">
              {/* Display the Name if it exists, otherwise fall back to ID */}
                <h3 className="text-2xl font-bold text-blue-400 mb-2">
                    {orgData.organizations?.name || "Unknown Organization"}
                </h3>
                <p className="text-gray-400 text-sm">
                    ID: {orgData.organization_id}
                </p>
            </p>
            {/* You can add a button here later to fetch the Org Name if needed */}
            <div className="mt-4 p-3 bg-green-900/30 border border-green-600 rounded text-green-300">
                You are a member of an active organization.
            </div>
        </div>
      ) : (
        <div className="text-center py-6">
            <p className="mb-4 text-gray-400">You haven't joined an organization yet.</p>
            {/* Logic for Create Plan button would check 'orgData' existence */}
            <button 
                onClick={handleCreateOrg}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
            >
                Create New Organization
            </button>
        </div>
      )}
    </div>
  );
};

export default OrganizationProfile;