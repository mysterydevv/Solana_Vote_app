import React, { useEffect, useState } from "react";
import * as Web3 from '@solana/web3.js';
import Modal from 'react-bootstrap/Modal';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import idl from './idl.json';
import { Buffer } from "buffer";
import { PublicKey, SystemProgram, Connection, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';

window.Buffer = Buffer;
const network = 'http://localhost:8899' //clusterApiUrl('');

function App() {

  const PROGRAM_ID = new PublicKey(idl.metadata.address);
  
  const [walletAddress, setWalletAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [modalShow, setModalShow] = React.useState(false);
  const [modalShow1, setModalShow1] = React.useState(false);
  const [selectedPostKey, setSelectedPostKey] = useState("");
  const [selectedPostName, setSelectedPostName] = useState("");
  const [selectedPostVote,setSelectedPostVote] = useState("");
  const [selectedPostComment,setSelectedPostComment] = useState("");
  const [selectedPostOwner,setSelectedPostOwner] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [topVotes, setTopVotes] = useState([]);
  const [topComments, setTopComments] = useState([]);
  const opts = {
    preflightCommitment: "processed"
  }
  const [searchText, setSearchText] = useState("");
  const connectWallet = async () => {
    const { solana } = window;
    try {
      if (solana) {
        const response = await solana.connect();
        setWalletAddress(response.publicKey.toString());
  
        // Move the console.log after setting the state
        console.log("Wallet Address:", response.publicKey.toString());
        fetchBalance(response.publicKey.toString());
        // Create a PublicKey instance after setting walletAddress
        
      }
    } catch (error) {
      console.log(error);
    }
  }
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(
      connection,
      window.solana,
      opts.preflightCommitment,
    );
    return provider;
  };
  const createCustomProgram = async () => {
    console.log("PROGRAM_ID:", PROGRAM_ID.toString());
    return new Program(idl, PROGRAM_ID, getProvider());
  }

  const updateWalletAddress = async () => {
    try {
      const { solana } = window;
      const response = await solana.connect();
      setWalletAddress(response.publicKey.toString());
    } catch (error) {
      console.error("Error updating wallet address:", error);
    }
  };
  
  const updateBalance = async () => {
    try {
      const adjustedBalance = await fetchBalance(walletAddress);
      setBalance(adjustedBalance);
    } catch (error) {
      console.error("Error updating balance:", error);
    }
  };
  

  const postList = async () => {
    try {
      const program = await createCustomProgram();
      const accounts = await program.account.postAccount.all(); // Fetch all post accounts
      
      const sortedPosts = accounts.sort((a, b) => b.account.timestamp - a.account.timestamp);
      setPosts(sortedPosts);

      const topVotes = sortedPosts
      .filter(post => post.account.voteCount > 0)
        .sort((a, b) => b.account.voteCount - a.account.voteCount)
        .slice(0, 5);
      setTopVotes(topVotes);

      // Update top comments
      const topComments = sortedPosts
        .filter(post => post.account.commentCount > 0)
        .sort((a, b) => b.account.commentCount - a.account.commentCount)
        .slice(0, 5);
      setTopComments(topComments);

    } catch (error) {
      console.log("Error in postList: ", error);
    }
  };

  const commentList = async () => {
    try {
      const program = await createCustomProgram();
      const accounts = await program.account.commentAccount.all(); // Fetch all post accounts

      setComments(accounts);
    } catch (error) {
      console.log("Error in commentList: ", error);
    }
  };

  const createComment = async (content) => {
    try {
      // Check if the content is empty or ""
      if (!content || content.trim() === "") {
        console.log("Content is empty. Comment not created.");
        return;
      }
  
      const provider = getProvider();
      const program = await createCustomProgram();
  
      const commentAccount = web3.Keypair.generate();
  
      await program.rpc.createComment(content, {
        accounts: {
          commentAccount: commentAccount.publicKey,
          postAccount: new PublicKey(selectedPostKey),
          authority: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
        },
        signers: [commentAccount],
      });
  
      console.log("Created a new CommentAccount w/ address:", commentAccount.publicKey.toString());
      setCommentInput("");
      updateBalance();
      postList();
      commentList();
      setSelectedPostComment((prevComment) => prevComment + 1);
    } catch (error) {
      console.log("Error in creating Comment: ", error);
    }
  };

  const createPost = async (name) => {
    try {

      if (!name || name.trim() === "") {
        console.log("Content is empty. Topic not created.");
        return;
      }
        const provider = getProvider();
        const program = await createCustomProgram();

        const postAccount = web3.Keypair.generate();

        await program.rpc.initPost(name, {
            accounts: {
                postAccount: postAccount.publicKey,
                authority: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
                clock: web3.SYSVAR_CLOCK_PUBKEY,
            },
            signers: [postAccount],
        });
        postList();
        setTopicInput("");
        console.log("Created a new PostAccount w/ address:", postAccount.publicKey.toString());
    } catch (error) {
        console.log("Error in creating PostAccount: ", error);
    }
}

const votePost = async () => {
  try {
    const program = await createCustomProgram();
    await program.rpc.votePost({
      accounts: {
        postAccount: new PublicKey(selectedPostKey),
      },
    });

    console.log("Voted for the post.");
    commentList();
    postList(); 
    updateWalletAddress();
    updateBalance();
    setSelectedPostVote((prevVote) => prevVote + 1);
  } catch (error) {
    console.log("Error in voting for the post: ", error);
  }
};


  const renderNotConnectedContainer = () => (
    <button className="btn" type="button" onClick={connectWallet}>
      <strong>CONNECT</strong>
      <div id="container-stars">
        <div id="stars"></div>
      </div>

      <div id="glow">
        <div className="circle"></div>
        <div className="circle"></div>
      </div>
    </button>

  );
  const disconnectWallet = async () => {
    try {
      if (window?.solana?.isPhantom) {
        // Check if the wallet is connected
        if (window.solana.publicKey) {
          console.log("Attempting to disconnect from Phantom wallet...");
          
          // Disconnect from the wallet
          if (typeof window.solana.disconnect === 'function') {
            await window.solana.disconnect();
  
            // Clear wallet-related state
            setWalletAddress(null);
            setBalance(null);
  
            // Log a message for successful disconnection
            console.log("Disconnected from Phantom wallet.");
          } else {
            console.error("window.solana.disconnect is not a function");
          }
        } else {
          // Wallet is already disconnected
          console.log("Phantom wallet is already disconnected.");
        }
      } else {
        alert("Phantom wallet not found.");
      }
    } catch (error) {
      console.error("Error disconnecting Phantom wallet:", error);
    }
  };
  
  useEffect(() => {

      if (walletAddress) {
        postList();
        commentList();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const viewTransaction = () => {
    if (walletAddress) {
      const explorerUrl = `https://explorer.solana.com/address/${walletAddress}?cluster=devnet`;
      window.open(explorerUrl, "_blank"); // Open the URL in a new tab or window
    }
  };
  

  const renderModal = () => {
  let filteredComments = comments;
  filteredComments = comments.filter(
    (comment) => comment.account.id.toString() === selectedPostKey,
  );
  filteredComments.sort((a, b) => a.account.timestamp - b.account.timestamp);

  function convertSolanaTimestampToDateTime(solanaTimestamp) {
    const timestamp = new Date(solanaTimestamp * 1000); // Multiply by 1000 to convert seconds to milliseconds

    const dateOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const formattedDate = timestamp.toLocaleString('en-US', dateOptions);
    const formattedTime = timestamp.toLocaleString('en-US', timeOptions);
    
    return (
      <>
        {formattedDate}
        <br />
        {formattedTime}
      </>
    );
  }

  return (
    <Modal
      show={modalShow}
      onHide={() => setModalShow(false)}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      className="dark-mode-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title id="example-modal-sizes-title-lg" className="modalTitle">
          {selectedPostName}
          <p className="selectedVote">Votes: {selectedPostVote}</p>
          <p className="selectedComment">Comments: {selectedPostComment}</p>
          <p className="selectedPostOwner">Posted By: {selectedPostOwner}</p>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
      <p>COMMENTS:</p>
      <div className="modalContainer">
        {filteredComments.map((item, index) => (
            <div className="commentsContent">
              <p>From: {item.account.user.toString()}</p>
              <p className="commentItem">"{item.account.content}"</p>
              <p>{convertSolanaTimestampToDateTime(item.account.timestamp)}</p>
            </div>
        ))}
        </div>
        <div className="commentInput">
          {searchInput1}
        </div>
        <div className="button1-container">
          <button className="hermi123" onClick={votePost}>Vote</button>
          <button className="hermi123" onClick={() => createComment(commentInput)}>Comment</button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

const renderModal1 = () => {
  
  return (
    <Modal
      show={modalShow1}
      onHide={() => setModalShow1(false)}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      className="dark-mode-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title id="example-modal-sizes-title-lg" className="modalTitle">
        Add Topic
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
      <div className="commentInput1">
          {searchInput2}
        </div>
        <div className="button1-container">
          <button className="hermi123" onClick={() => createPost(topicInput)}>Post</button>
        </div>
      </Modal.Body>
    </Modal>
  );
};


  const renderConnectedContainer = () => {
    let filteredPosts = posts;
  
    if (searchInput) {
      filteredPosts = posts.filter(
        (item) => item.account.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }
  
    return (
      <div className="main-div">
        <div className="border2">
          <div className="timtim">
            <p className="timtimP">Top Voted</p>
            <div className="container2">
            {topVotes.map((item)=>(
              <div className="programming-languages">
                <div className="name">{item.account.name}</div>
                <div className="votes">
                  <span className="votes-text">Votes: {item.account.voteCount}</span>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
        <div className="border">
          <div className="main-container">
            {filteredPosts.map((item, index) => (
              <div className="programming-languages" key={index} onClick={() => {
                  setSelectedPostKey(item.publicKey.toString());
                  setSelectedPostName(item.account.name);
                  setSelectedPostVote(item.account.voteCount);
                  setSelectedPostComment(item.account.commentCount);
                  setSelectedPostOwner(item.account.authority.toString());
                  setModalShow(true);
                  
                }}>
                <div className="name">{item.account.name}</div>
                <div className="votes">
                  <span className="votes-text">Votes: {item.account.voteCount}</span>
                </div>
                <div className="comments">
                  <span className="comment-text">Comments: {item.account.commentCount}</span>
                </div>
                <div className="add">
                  <span className="add-text">Added by: {item.account.authority.toString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border2">
          <div className="timtim1">
          <p className="timtimP">Top Commented</p>
          <div className="container2">
            {topComments.map((item)=>(
              <div className="programming-languages">
                <div className="name">{item.account.name}</div>
                <div className="comments">
                  <span className="comment-text">Comments: {item.account.commentCount}</span>
                </div>
              </div>
            ))}
            </div>  
          </div>
        </div>
      </div>
    );
  };
  
  
  const handleSearchInput = (e) => {
    setSearchText(e.target.value);
  };

  const handleCommentInputChange = (e) => {
    setCommentInput(e.target.value);
  };

  const handleTopicInputChange = (e) => {
    setTopicInput(e.target.value);
  };


  useEffect(() => {
    const onLoad = async () => {
      
      if (walletAddress) {
        const adjustedBalance = await fetchBalance(walletAddress);
        setBalance(adjustedBalance);
      }
    };
  
    onLoad();
  
    return () => window.removeEventListener("load", onLoad);
  }, [walletAddress]);
  
  

  const fetchBalance = async (walletAddress) => {
    try {
      const connection = new Web3.Connection(Web3.clusterApiUrl("devnet"));
      const publicKeyObj = new Web3.PublicKey(walletAddress);
      const solBalance = await connection.getBalance(publicKeyObj);
      // Divide the balance by 1,000,000,000
      const adjustedBalance = solBalance / 1000000000;
      setBalance(adjustedBalance); // Update the balance state here
      return adjustedBalance;
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };
  const searchInput = (
    <div className="box-input">
      <div className="border">
        <input type="text" className="input" placeholder="Name" value={searchText}
                onChange={handleSearchInput}/>
      </div>
    </div>
  );
  const searchInput1 = (
    <div className="box-input">
      <div className="border">
        <input type="text" className="input" placeholder="Enter Comment" onChange={handleCommentInputChange} value={commentInput}/>
      </div>
    </div>
  );
  const searchInput2 = (
    <div className="box-input">
      <div className="border">
        <input type="text" className="input" placeholder="Topic Name" onChange={handleTopicInputChange} value={topicInput}/>
      </div>
    </div>
  );
  
  const profile =(
    <div className="card">
      <div className="card__info">
        <div className="card__logo">Solana</div>
        <div className="card__chip">
          <svg
            className="card__chip-lines"
            role="img"
            width="20px"
            height="20px"
            viewBox="0 0 100 100"
            aria-label="Chip"
          >
            <g opacity="0.8">
              <polyline
                points="0,50 35,50"
                fill="none"
                stroke="#000"
                stroke-width="2"
              ></polyline>
              <polyline
                points="0,20 20,20 35,35"
                fill="none"
                stroke="#000"
                stroke-width="2"
              ></polyline>
              <polyline
                points="50,0 50,35"
                fill="none"
                stroke="#000"
                stroke-width="2"
              ></polyline>
              <polyline
                points="65,35 80,20 100,20"
                fill="none"
                stroke="#000"
                stroke-width="2"
              ></polyline>
              <polyline
                points="100,50 65,50"
                fill="none"
                stroke="#000"
                stroke-width="2"
              ></polyline>
              <polyline
                points="35,35 65,35 65,65 35,65 35,35"
                fill="none"
                stroke="#000"
                stroke-width="2"
              ></polyline>
              <polyline
                points="0,80 20,80 35,65"
                fill="none"
                stroke="#000"
                stroke-width="2"
              ></polyline>
              <polyline
                points="50,100 50,65"
                fill="none"
                stroke="#000"
                stroke-width="2"
              ></polyline>
              <polyline
                points="65,65 80,80 100,80"
                fill="none"
                stroke="#000"
                stroke-width="2"
              ></polyline>
            </g>
          </svg>
          <div className="card__chip-texture"></div>
        </div>
        <div className="card__type">Balance</div>
        <div className="card__number">
          <span className="card__digit-group">{balance} SOL</span>
        </div>
        <div className="card__name" aria-label="Dee Stroyer">{walletAddress}</div>
        <div className="card__vendor" role="img" aria-labelledby="card-vendor">
          <span id="card-vendor" className="card__vendor-sr">Solana</span>
        </div>
        <div className="card__texture"></div>
      </div>
    </div>
  )

  return (
    <div className="App">
      <header className="App-header">
        {!walletAddress && (
          <p className="larger-font">Share your insights and opinions on a variety of engaging <code>TOPICS</code> shaping our digital discourse</p>
        )}{walletAddress && profile}
        {walletAddress &&
          <div className="button-container">
            <button className="btn" type="button" onClick={disconnectWallet}>
              <strong>DISCONNECT</strong>
              <div id="container-stars">
                <div id="stars"></div>
              </div>

              <div id="glow">
                <div className="circle"></div>
                <div className="circle"></div>
              </div>
            </button>
            <button className="btn" type="button" onClick={viewTransaction}>
              <strong>HISTORY </strong>
              <div id="container-stars">
                <div id="stars"></div>
              </div>
            </button>
            <button className="Btn2" onClick={() => { setModalShow1(true)}}> 
  
              <div className="sign2">+</div>
              
              <div className="text2">Add</div>
            </button>
            </div>}
        {walletAddress && searchInput}
        {!walletAddress && renderNotConnectedContainer()}
        {walletAddress && renderConnectedContainer()}
        {modalShow && renderModal()}
        {modalShow1 && renderModal1()}
      </header>
    </div>
  );
}

export default App;
